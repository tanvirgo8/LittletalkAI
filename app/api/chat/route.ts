// ============================================================
// LittleTalk AI - Chat API Route Handler (POST /api/chat)
// ============================================================
import { NextResponse } from 'next/server';
import { ChatRequestSchema } from '@/lib/validations';
import { detectMode, validateModeTransition, extractTopicFromMessage } from '@/lib/mode-detection';
import { generateSELResponse, generateTopicIntro } from '@/lib/sel-engine';
import {
  getNextActivity,
  getActivityById,
  TOPIC_LABELS,
  LEVEL_DESCRIPTIONS,
} from '@/lib/learning-content';
import {
  getSession,
  createSession,
  updateSession,
  addTurn,
  calculateProgressSummary,
} from '@/lib/session-manager';
import { getDatabaseAdapter } from '@/lib/db-adapter';
import { getChatProvider } from '@/lib/chat-provider';
import type {
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
      session.currentTopic = topicHint as LearningTopic;
    }

    // 3. Response Generation Strategy
    let reply = '';
    let quickReplies: QuickReply[] | undefined;
    let activityDisplay: ActivityDisplay | undefined;
    let suggestedBreak = false;

    const engineStart = performance.now();

    if (targetMode === 'LEARNING') {
      // Find or continue activity
      let activity = session.currentActivityId
        ? getActivityById(session.currentActivityId)
        : undefined;

      // If no activity or current completed, get next
      if (!activity) {
        activity = getNextActivity(
          session.currentLevel,
          session.completedActivities,
          session.currentTopic
        );
      }

      if (activity) {
        session.currentActivityId = activity.id;
        session.currentTopic = activity.topic;

        // Pick next question not yet answered in this session
        const unansweredQuestion =
          activity.questions.find(
            (q) => !session?.answeredQuestionIds.includes(q.id)
          ) || activity.questions[0];

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
        // All activities for this level completed!
        reply = `Superstar! 🌟 You've explored so many activities in Level ${session.currentLevel}! Would you like to practice again or explore something fun?`;
        quickReplies = [
          { id: 'qr-colors', label: '🎨 Practice Colors', value: 'teach me colors' },
          { id: 'qr-animals', label: '🐾 Practice Animals', value: 'teach me animals' },
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
      const sel = generateSELResponse({
        mode: 'SUPPORT',
        attemptCount: session.attemptCount,
        hasFrustration: true,
        hasSafetyConcern: isSafety,
        isGreeting: false,
        isReturningFromBreak: false,
        childMessage: message,
        currentLevel: session.currentLevel,
      });
      reply = sel.message;

      if (!isSafety) {
        quickReplies = [
          { id: 'qr-easier', label: '🌸 Easier Question', value: 'give me an easier question' },
          { id: 'qr-break', label: '🌙 Take a Break', value: 'I want a break' },
          { id: 'qr-try', label: '💪 Try Again', value: 'teach me' },
        ];
      }
    } else if (targetMode === 'ENGAGEMENT') {
      reply = "Let's play! 🎮 What kind of game would you like?";
      quickReplies = [
        { id: 'qr-game-colors', label: '🎨 Color Match', value: 'teach me colors' },
        { id: 'qr-game-animals', label: '🐾 Animal Quiz', value: 'teach me animals' },
        { id: 'qr-game-numbers', label: '🔢 Star Counter', value: 'teach me numbers' },
      ];
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
        { id: 'qr-learn', label: '📚 Learn Words', value: 'teach me' },
        { id: 'qr-joke', label: '😄 Tell a Joke', value: 'tell me a joke' },
        { id: 'qr-story', label: '📖 Tell a Story', value: 'tell me a story' },
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
