// ============================================================
// LittleTalk AI - Chat API Route Handler (POST /api/chat)
// ============================================================
import { NextResponse } from 'next/server';
import { ChatRequestSchema } from '@/lib/validations';
import { detectMode, validateModeTransition, extractTopicFromMessage } from '@/lib/mode-detection';
import { generateSELResponse, generateTopicIntro, generateHintMessage } from '@/lib/sel-engine';
import {
  getNextActivity,
  getActivityById,
  getActivitiesByTopic,
  TOPIC_LABELS,
  LEVEL_DESCRIPTIONS,
} from '@/lib/learning-content';
import {
  getSession,
  createSession,
  updateSession,
  addTurn,
  calculateProgressSummary,
  addAssessedAnswer,
} from '@/lib/session-manager';
import { scoreAnswer } from '@/lib/mastery-engine';
import { getDatabaseAdapter } from '@/lib/db-adapter';
import { getChatProvider } from '@/lib/chat-provider';
import type {
  Activity,
  ChatResponse,
  QuickReply,
  ActivityDisplay,
  LearningTopic,
  ConversationMode,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const startTime = performance.now();
  let modeDetectionMs = 0;
  let learningEngineMs = 0;
  let dbMs = 0;
  let llmMs = 0;

  const correlationId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    const rawBody = await req.json();
    const parseResult = ChatRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request payload',
          details: parseResult.error.format(),
          code: 'INVALID_PAYLOAD',
          correlationId,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const { message, sessionId, profileId, selectedOption } = parseResult.data;

    // 1. Session Retrieval / Creation
    const dbStart = performance.now();
    const db = getDatabaseAdapter();
    let session = getSession(sessionId);

    if (!session) {
      // Check database adapter
      const persisted = await db.getSession(sessionId);
      if (persisted) {
        session = persisted;
      } else {
        session = createSession(profileId, 1, sessionId);
        await db.saveSession(session);
      }
    }
    dbMs += Math.round(performance.now() - dbStart);

    // 2. Mode Detection
    const modeStart = performance.now();
    const detectionResult = detectMode(message, session);
    let targetMode: ConversationMode = detectionResult.mode;

    // Validate mode transition rules
    const isValidTransition = validateModeTransition(
      session.currentMode,
      targetMode,
      message
    );
    if (!isValidTransition) {
      targetMode = session.currentMode;
    }
    modeDetectionMs = Math.round(performance.now() - modeStart);

    // Topic extraction if specified by child
    const topicHint = extractTopicFromMessage(message);
    if (topicHint) {
      const isNewTopic = session.currentTopic !== topicHint;
      session.currentTopic = topicHint as LearningTopic;
      if (isNewTopic || !session.currentActivityId) {
        session.currentActivityId = undefined;
        session.currentQuestionId = undefined;
      } else if (session.currentActivityId) {
        const currentAct = getActivityById(session.currentActivityId);
        if (!currentAct || currentAct.topic !== topicHint) {
          session.currentActivityId = undefined;
          session.currentQuestionId = undefined;
        }
      }
    }

    // Skip to next question request
    const isNextQuestionRequest = /next (question|activity|one)|another question|skip/i.test(message);
    if (isNextQuestionRequest && session.currentQuestionId) {
      if (!session.answeredQuestionIds.includes(session.currentQuestionId)) {
        session.answeredQuestionIds.push(session.currentQuestionId);
      }
    }

    // 3. Response Generation Strategy
    let reply = '';
    let quickReplies: QuickReply[] | undefined;
    let activityDisplay: ActivityDisplay | undefined;
    let suggestedBreak = false;

    const engineStart = performance.now();

    // Check if child is asking for an easier question or a hint
    const wantsEasier = /easier (question|one)|give me (an? )?easier/i.test(message);
    const wantsHint = /hint|clue/i.test(message);

    // Check if the message is an answer to the current active question
    let activeActForAnswer = session.currentActivityId
      ? getActivityById(session.currentActivityId)
      : undefined;
    let activeQForAnswer = activeActForAnswer?.questions.find(
      (q) => q.id === session.currentQuestionId
    );

    const isDirectAnswer =
      activeActForAnswer &&
      activeQForAnswer &&
      (targetMode === 'LEARNING' || targetMode === 'ENGAGEMENT') &&
      !isNextQuestionRequest &&
      !wantsEasier &&
      !wantsHint &&
      (activeQForAnswer.options?.some(
        (opt) => opt.trim().toLowerCase() === message.trim().toLowerCase()
      ) ||
        activeQForAnswer.correctAnswer.trim().toLowerCase() === message.trim().toLowerCase());

    if (isDirectAnswer && activeActForAnswer && activeQForAnswer) {
      const isCorrect = scoreAnswer(
        message,
        activeQForAnswer.correctAnswer,
        activeActForAnswer.type === 'conversation_prompt'
      );

      // Register assessed answer
      const assessedRecord = {
        questionId: activeQForAnswer.id,
        activityId: activeActForAnswer.id,
        correct: isCorrect,
        topic: activeActForAnswer.topic,
        level: session.currentLevel,
        timestamp: new Date().toISOString(),
      };
      addAssessedAnswer(session.sessionId, assessedRecord);

      if (!session.answeredQuestionIds.includes(activeQForAnswer.id)) {
        session.answeredQuestionIds.push(activeQForAnswer.id);
      }

      // Find next question in this activity
      let nextQ = activeActForAnswer.questions.find(
        (q) => !session.answeredQuestionIds.includes(q.id)
      );

      if (!nextQ) {
        if (!session.completedActivities.includes(activeActForAnswer.id)) {
          session.completedActivities.push(activeActForAnswer.id);
        }
        const nextAct = getNextActivity(
          session.currentLevel,
          session.completedActivities,
          session.currentTopic
        );
        if (nextAct && nextAct.id !== activeActForAnswer.id) {
          activeActForAnswer = nextAct;
          session.currentActivityId = activeActForAnswer.id;
          session.currentTopic = activeActForAnswer.topic;
          nextQ =
            activeActForAnswer.questions.find(
              (q) => !session.answeredQuestionIds.includes(q.id)
            ) || activeActForAnswer.questions[0];
        } else {
          activeActForAnswer.questions.forEach((q) => {
            const idx = session.answeredQuestionIds.indexOf(q.id);
            if (idx > -1) session.answeredQuestionIds.splice(idx, 1);
          });
          nextQ = activeActForAnswer.questions[0];
        }
      }

      session.currentQuestionId = nextQ.id;

      const nextOptions =
        nextQ.options?.map((opt, idx) => ({
          id: `opt-${idx}`,
          label: opt,
          value: opt,
        })) || [];

      activityDisplay = {
        activityId: activeActForAnswer.id,
        questionId: nextQ.id,
        question: nextQ.text,
        imageHint: nextQ.imageHint,
        options: nextOptions,
        topic: activeActForAnswer.topic,
        level: session.currentLevel,
        hint: nextQ.hint,
      };

      if (targetMode === 'ENGAGEMENT') {
        const gameCategories: QuickReply[] = [
          { id: 'qr-game-animals', label: '🐾 Animal Quiz', value: 'play animal game' },
          { id: 'qr-game-colors', label: '🎨 Color Match', value: 'play color game' },
          { id: 'qr-game-numbers', label: '🔢 Star Counter', value: 'play number game' },
          { id: 'qr-game-fruits', label: '🍎 Fruit Pop', value: 'play fruit game' },
          { id: 'qr-game-words', label: '🪑 Word Hunt', value: 'play word game' },
        ];
        quickReplies = [...nextOptions, ...gameCategories];
      } else {
        quickReplies = nextOptions;
      }

      if (isCorrect) {
        reply = `Spot on! ⭐ "${activeQForAnswer.correctAnswer}" is correct! 🎉\n\n${generateTopicIntro(
          activeActForAnswer.topic,
          session.currentLevel
        )} Let's try: ${nextQ.text}`;
      } else {
        reply = `Good try! 😊 The answer was "${activeQForAnswer.correctAnswer}". Every try helps you learn!\n\n${generateTopicIntro(
          activeActForAnswer.topic,
          session.currentLevel
        )} Let's try: ${nextQ.text}`;
      }
    } else if (wantsEasier) {
      targetMode = 'LEARNING';
      const easyActivity = getActivityById('l1-colors-1') || getActivityById('l1-animals-1');
      if (easyActivity) {
        session.currentActivityId = easyActivity.id;
        session.currentTopic = easyActivity.topic;
        const easyQ = easyActivity.questions[0];
        session.currentQuestionId = easyQ.id;

        const options = easyQ.options?.map((opt, idx) => ({
          id: `opt-${idx}`,
          label: opt,
          value: opt,
        })) || [];

        activityDisplay = {
          activityId: easyActivity.id,
          questionId: easyQ.id,
          question: easyQ.text,
          imageHint: easyQ.imageHint,
          options,
          topic: easyActivity.topic,
          level: 1,
          hint: easyQ.hint,
        };
        reply = `Here is a gentle, easier question for you! 🌸 ${easyQ.text}`;
      } else {
        reply = "Here is an easier question! 🌸 You can do it!";
      }

      quickReplies = [
        { id: 'qr-hint', label: '💡 Give Me a Hint', value: 'give me a hint' },
        { id: 'qr-break', label: '🌙 Take a Break', value: 'I want a break' },
        { id: 'qr-try', label: '💪 Try Again', value: 'teach me words' },
      ];
    } else if (wantsHint) {
      let hintText = "Look closely at the pictures and options! You've got this! ⭐";
      let activeAct = session.currentActivityId ? getActivityById(session.currentActivityId) : undefined;
      let activeQ = activeAct?.questions.find((q) => q.id === session.currentQuestionId) || activeAct?.questions[0];

      if (activeQ?.hint) {
        hintText = activeQ.hint;
      }

      reply = generateHintMessage(hintText);

      if (activeAct && activeQ) {
        const options = activeQ.options?.map((opt, idx) => ({
          id: `opt-${idx}`,
          label: opt,
          value: opt,
        })) || [];

        activityDisplay = {
          activityId: activeAct.id,
          questionId: activeQ.id,
          question: activeQ.text,
          imageHint: activeQ.imageHint,
          options,
          topic: activeAct.topic,
          level: session.currentLevel,
          hint: activeQ.hint,
        };
      }

      quickReplies = [
        { id: 'qr-easier', label: '🌸 Easier Question', value: 'give me an easier question' },
        { id: 'qr-try', label: '💪 Let\'s Try', value: 'teach me' },
        { id: 'qr-break', label: '🌙 Take a Break', value: 'I want a break' },
      ];
    } else if (targetMode === 'LEARNING') {
      // Find or continue activity
      let activity = session.currentActivityId
        ? getActivityById(session.currentActivityId)
        : undefined;

      // If switching topics or no active activity, find matching activity for this topic
      if (!activity) {
        if (session.currentTopic) {
          const topicActivities = getActivitiesByTopic(session.currentTopic);
          activity =
            topicActivities.find(
              (a) => a.level === session.currentLevel && !session.completedActivities.includes(a.id)
            ) ||
            topicActivities.find((a) => a.level === session.currentLevel) ||
            topicActivities[0];
        }

        if (!activity) {
          activity = getNextActivity(
            session.currentLevel,
            session.completedActivities,
            session.currentTopic
          );
        }
      }

      // Fallback if not found
      if (!activity) {
        activity = getActivityById('l1-colors-1') || getActivityById('l1-animals-1');
      }

      if (activity) {
        session.currentActivityId = activity.id;
        session.currentTopic = activity.topic;

        // Pick next question not yet answered in this session
        let unansweredQuestion = activity.questions.find(
          (q) => !session?.answeredQuestionIds.includes(q.id)
        );

        // If all questions in this activity are answered, advance to next activity!
        if (!unansweredQuestion) {
          if (!session.completedActivities.includes(activity.id)) {
            session.completedActivities.push(activity.id);
          }
          const nextAct = getNextActivity(
            session.currentLevel,
            session.completedActivities,
            session.currentTopic
          );
          if (nextAct && nextAct.id !== activity.id) {
            activity = nextAct;
            session.currentActivityId = activity.id;
            session.currentTopic = activity.topic;
            unansweredQuestion = activity.questions.find(
              (q) => !session?.answeredQuestionIds.includes(q.id)
            ) || activity.questions[0];
          } else {
            // Recycle questions for continuous fun practice
            activity.questions.forEach((q) => {
              const idx = session.answeredQuestionIds.indexOf(q.id);
              if (idx > -1) session.answeredQuestionIds.splice(idx, 1);
            });
            unansweredQuestion = activity.questions[0];
          }
        }

        session.currentQuestionId = unansweredQuestion.id;

        const topicName = TOPIC_LABELS[activity.topic] || activity.topic;
        reply = `${generateTopicIntro(activity.topic, session.currentLevel)} Let's try: ${unansweredQuestion.text}`;

        quickReplies = unansweredQuestion.options?.map((opt, idx) => ({
          id: `opt-${idx}`,
          label: opt,
          value: opt,
        }));

        activityDisplay = {
          activityId: activity.id,
          questionId: unansweredQuestion.id,
          question: unansweredQuestion.text,
          imageHint: unansweredQuestion.imageHint,
          options: quickReplies || [],
          topic: activity.topic,
          level: session.currentLevel,
          hint: unansweredQuestion.hint,
        };
      } else {
        reply = `Superstar! 🌟 You've explored so many activities in Level ${session.currentLevel}! Would you like to practice again or explore something fun?`;
        quickReplies = [
          { id: 'qr-words', label: '🪑 Learn Words', value: 'teach me words' },
          { id: 'qr-animals', label: '🐾 Practice Animals', value: 'teach me animals' },
          { id: 'qr-colors', label: '🎨 Practice Colors', value: 'teach me colors' },
          { id: 'qr-chat', label: '💬 Let\'s Chat', value: 'tell me a story' },
        ];
      }
    } else if (targetMode === 'BREAK') {
      suggestedBreak = true;
      const sel = generateSELResponse({
        mode: 'BREAK',
        attemptCount: 0,
        hasFrustration: false,
        hasSafetyConcern: false,
        isGreeting: false,
        isReturningFromBreak: false,
        childMessage: message,
        currentLevel: session.currentLevel,
      });
      reply = sel.message;
      quickReplies = [
        { id: 'qr-rest', label: '💤 Take a nap', value: 'I am resting' },
        { id: 'qr-back', label: '🌟 I\'m Ready Now!', value: 'I am ready to learn again' },
      ];
    } else if (targetMode === 'SUPPORT') {
      const isSafety = detectionResult.detectedIntent === 'safety';
      if (isSafety) {
        const sel = generateSELResponse({
          mode: 'SUPPORT',
          attemptCount: session.attemptCount,
          hasFrustration: true,
          hasSafetyConcern: true,
          isGreeting: false,
          isReturningFromBreak: false,
          childMessage: message,
          currentLevel: session.currentLevel,
        });
        reply = sel.message;
      } else {
        let activeAct = session.currentActivityId ? getActivityById(session.currentActivityId) : undefined;
        let activeQ = activeAct?.questions.find((q) => q.id === session.currentQuestionId);

        let clueSnippet = activeQ?.hint ? ` Hint: ${activeQ.hint} 💡` : '';
        reply = `Take your time, friend! 🤗 Learning takes practice and mistakes are how our brains grow!${clueSnippet} Would you like an easier question or a hint?`;

        if (activeAct && activeQ) {
          const options = activeQ.options?.map((opt, idx) => ({
            id: `opt-${idx}`,
            label: opt,
            value: opt,
          })) || [];

          activityDisplay = {
            activityId: activeAct.id,
            questionId: activeQ.id,
            question: activeQ.text,
            imageHint: activeQ.imageHint,
            options,
            topic: activeAct.topic,
            level: session.currentLevel,
            hint: activeQ.hint,
          };
        }

        quickReplies = [
          { id: 'qr-easier', label: '🌸 Easier Question', value: 'give me an easier question' },
          { id: 'qr-hint', label: '💡 Give Me a Hint', value: 'give me a hint' },
          { id: 'qr-break', label: '🌙 Take a Break', value: 'I want a break' },
          { id: 'qr-try', label: '💪 Keep Trying', value: 'teach me' },
        ];
      }
    } else if (targetMode === 'ENGAGEMENT') {
      // Pick a game activity based on topicHint or current topic
      let gameTopic: LearningTopic = (topicHint as LearningTopic) || session.currentTopic || 'animals';

      // Explicitly retrieve activities for this game topic
      const topicActivities = getActivitiesByTopic(gameTopic);
      let activity: Activity | undefined;

      // If already in an activity for this topic and no new topic requested, continue it
      if (session.currentActivityId && !topicHint) {
        const currentAct = getActivityById(session.currentActivityId);
        if (currentAct && currentAct.topic === gameTopic) {
          activity = currentAct;
        }
      }

      if (!activity) {
        activity =
          topicActivities.find(
            (a) => a.level === session.currentLevel && !session.completedActivities.includes(a.id)
          ) ||
          topicActivities.find((a) => a.level === session.currentLevel) ||
          topicActivities[0];
      }

      if (!activity) {
        activity = getActivityById('l1-animals-1') || getActivityById('l1-colors-1');
      }

      if (activity) {
        session.currentActivityId = activity.id;
        session.currentTopic = activity.topic;

        let unansweredQuestion = activity.questions.find(
          (q) => !session?.answeredQuestionIds.includes(q.id)
        );

        if (!unansweredQuestion) {
          // Recycle questions for continuous fun game play
          activity.questions.forEach((q) => {
            const idx = session.answeredQuestionIds.indexOf(q.id);
            if (idx > -1) session.answeredQuestionIds.splice(idx, 1);
          });
          unansweredQuestion = activity.questions[0];
        }

        session.currentQuestionId = unansweredQuestion.id;

        const options = unansweredQuestion.options?.map((opt, idx) => ({
          id: `opt-${idx}`,
          label: opt,
          value: opt,
        })) || [];

        activityDisplay = {
          activityId: activity.id,
          questionId: unansweredQuestion.id,
          question: `🎮 ${unansweredQuestion.text}`,
          imageHint: unansweredQuestion.imageHint,
          options,
          topic: activity.topic,
          level: session.currentLevel,
          hint: unansweredQuestion.hint,
        };

        const topicName = TOPIC_LABELS[activity.topic] || activity.topic;
        reply = `Game On! 🎮 Let's play the ${topicName} game! ${unansweredQuestion.text}`;

        const answerQuickReplies: QuickReply[] = options.map((opt) => ({
          id: opt.id,
          label: opt.label,
          value: opt.value,
        }));

        const categoryQuickReplies: QuickReply[] = [
          { id: 'qr-game-animals', label: '🐾 Animal Quiz', value: 'play animal game' },
          { id: 'qr-game-colors', label: '🎨 Color Match', value: 'play color game' },
          { id: 'qr-game-numbers', label: '🔢 Star Counter', value: 'play number game' },
          { id: 'qr-game-fruits', label: '🍎 Fruit Pop', value: 'play fruit game' },
          { id: 'qr-game-words', label: '🪑 Word Hunt', value: 'play word game' },
        ];

        quickReplies = [...answerQuickReplies, ...categoryQuickReplies];
      } else {
        reply = "Let's play! 🎮 Choose a game category below!";
        quickReplies = [
          { id: 'qr-game-animals', label: '🐾 Animal Quiz', value: 'play animal game' },
          { id: 'qr-game-colors', label: '🎨 Color Match', value: 'play color game' },
          { id: 'qr-game-numbers', label: '🔢 Star Counter', value: 'play number game' },
          { id: 'qr-game-fruits', label: '🍎 Fruit Pop', value: 'play fruit game' },
          { id: 'qr-game-words', label: '🪑 Word Hunt', value: 'play word game' },
        ];
      }
    } else {
      // CONVERSATION mode
      const chatProvider = getChatProvider();
      if (chatProvider.isAvailable()) {
        const llmStart = performance.now();
        const llmRes = await chatProvider.generateResponse(
          message,
          `Child Level: ${session.currentLevel}, Mode: ${targetMode}`
        );
        llmMs = Math.round(performance.now() - llmStart);
        reply = llmRes.content;
      } else {
        const sel = generateSELResponse({
          mode: 'CONVERSATION',
          attemptCount: 0,
          hasFrustration: false,
          hasSafetyConcern: false,
          isGreeting: /^(hi|hello|hey|hiya)/i.test(message),
          isReturningFromBreak: false,
          childMessage: message,
          currentLevel: session.currentLevel,
        });
        reply = sel.message;
      }

      quickReplies = [
        { id: 'qr-learn', label: '📚 Learn Words', value: 'teach me words' },
        { id: 'qr-joke', label: '😄 Tell a Joke', value: 'tell me a joke' },
        { id: 'qr-story', label: '📖 Tell a Story', value: 'tell me a story' },
        { id: 'qr-sing', label: '🎵 Sing a Song', value: 'sing a song' },
      ];
    }

    learningEngineMs = Math.round(performance.now() - engineStart);

    // 4. Update session state & context
    session.currentMode = targetMode;
    addTurn(session.sessionId, {
      role: 'child',
      content: message,
      timestamp: new Date().toISOString(),
      mode: targetMode,
    });
    addTurn(session.sessionId, {
      role: 'bot',
      content: reply,
      timestamp: new Date().toISOString(),
      mode: targetMode,
    });

    // Save session in background / adapter
    const dbSaveStart = performance.now();
    updateSession(session.sessionId, {
      currentMode: targetMode,
      currentActivityId: session.currentActivityId,
      currentQuestionId: session.currentQuestionId,
      currentTopic: session.currentTopic,
    });
    await db.saveSession(session);
    dbMs += Math.round(performance.now() - dbSaveStart);

    const progressSummary = calculateProgressSummary(session);
    const totalMs = Math.round(performance.now() - startTime);

    const responsePayload: ChatResponse = {
      reply,
      mode: targetMode,
      quickReplies,
      activity: activityDisplay,
      suggestedBreak,
      progressUpdate: {
        currentLevel: session.currentLevel,
        starsEarned: 0,
        totalStars: progressSummary.starsEarned,
        masteryPercent: Math.round(
          (progressSummary.totalCorrect / Math.max(1, progressSummary.totalAnswered)) * 100
        ),
        topicLabel: session.currentTopic
          ? TOPIC_LABELS[session.currentTopic]
          : LEVEL_DESCRIPTIONS[session.currentLevel],
      },
      timings: {
        totalMs,
        modeDetectionMs,
        learningEngineMs,
        dbMs,
        llmMs: llmMs > 0 ? llmMs : undefined,
      },
    };

    return NextResponse.json(responsePayload, {
      headers: {
        'X-Correlation-Id': correlationId,
        'X-Response-Time': `${totalMs}ms`,
      },
    });
  } catch (error: unknown) {
    console.error('Chat API Error:', error);
    const totalMs = Math.round(performance.now() - startTime);
    return NextResponse.json(
      {
        error: 'An internal server error occurred',
        code: 'INTERNAL_ERROR',
        correlationId,
        timestamp: new Date().toISOString(),
        timings: { totalMs, modeDetectionMs, learningEngineMs, dbMs },
      },
      { status: 500 }
    );
  }
}
