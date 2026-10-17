// ============================================================
// LittleTalk AI - Answer Submission Route (POST /api/activity/answer)
// Idempotent, server-side scored, deterministic progression
// ============================================================
import { NextResponse } from 'next/server';
import { AnswerRequestSchema } from '@/lib/validations';
import { getActivityById } from '@/lib/learning-content';
import {
  scoreAnswer,
  isDuplicateAnswer,
  calculateStarsEarned,
  determineNextLevel,
  buildLevelUpEvent,
  buildMasteryUpdate,
  needsReview,
} from '@/lib/mastery-engine';
import {
  getSession,
  createSession,
  addAssessedAnswer,
  updateSession,
} from '@/lib/session-manager';
import { getDatabaseAdapter } from '@/lib/db-adapter';
import type {
  AnswerResponse,
  AssessedAnswer,
  LevelUpEvent,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const correlationId = `ans_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    const rawBody = await req.json();
    const parseResult = AnswerRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid answer payload',
          details: parseResult.error.format(),
          code: 'INVALID_PAYLOAD',
          correlationId,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const { sessionId, profileId, activityId, questionId, answer, answerId } =
      parseResult.data;

    const db = getDatabaseAdapter();
    let session = getSession(sessionId);
    if (!session) {
      session = (await db.getSession(sessionId)) || createSession(profileId, 1, sessionId);
      await db.saveSession(session);
    }

    // 1. Fetch Activity and Question
    const activity = getActivityById(activityId);
    if (!activity) {
      return NextResponse.json(
        {
          error: 'Activity not found',
          code: 'ACTIVITY_NOT_FOUND',
          correlationId,
        },
        { status: 404 }
      );
    }

    const question = activity.questions.find((q) => q.id === questionId);
    if (!question) {
      return NextResponse.json(
        {
          error: 'Question not found in specified activity',
          code: 'QUESTION_NOT_FOUND',
          correlationId,
        },
        { status: 404 }
      );
    }

    // 2. Idempotency Check
    const alreadyAnswered = isDuplicateAnswer(
      questionId,
      session.answeredQuestionIds
    );

    if (alreadyAnswered) {
      // Return previous result without re-awarding stars or double-counting attempt
      const previousAnswer = session.recentAssessedAnswers.find(
        (a) => a.questionId === questionId
      );
      const isCorrect = previousAnswer?.correct ?? scoreAnswer(answer, question.correctAnswer);

      const masteryUpdate = buildMasteryUpdate(session);

      return NextResponse.json(
        {
          correct: isCorrect,
          correctAnswer: question.correctAnswer,
          feedback: isCorrect
            ? "You already answered this correctly! Great job! ⭐"
            : `You already tried this one! The answer was: ${question.correctAnswer}.`,
          stars: 0, // No duplicate stars awarded!
          masteryUpdate,
          isDuplicate: true,
        },
        {
          headers: {
            'X-Correlation-Id': correlationId,
            'X-Idempotent-Replay': 'true',
          },
        }
      );
    }

    // 3. Server-Side Scoring
    const isConversationPrompt = activity.type === 'conversation_prompt';
    const isCorrect = scoreAnswer(
      answer,
      question.correctAnswer,
      isConversationPrompt
    );

    // 4. Record Assessed Answer
    const assessedRecord: AssessedAnswer = {
      questionId,
      activityId,
      correct: isCorrect,
      topic: activity.topic,
      level: session.currentLevel,
      timestamp: new Date().toISOString(),
    };

    addAssessedAnswer(sessionId, assessedRecord);

    // Refetch updated session
    session = getSession(sessionId) || session;

    // Calculate stars earned
    const starsEarned = calculateStarsEarned(
      isCorrect,
      session.recentAssessedAnswers
    );

    // 5. Progression & Mastery Verification
    let levelUpEvent: LevelUpEvent | undefined;
    const nextLevelResult = determineNextLevel(
      session.currentLevel,
      session.recentAssessedAnswers
    );

    if (nextLevelResult.levelUp) {
      levelUpEvent = buildLevelUpEvent(
        session.currentLevel,
        nextLevelResult.level
      );
      session.currentLevel = nextLevelResult.level;
      updateSession(sessionId, { currentLevel: nextLevelResult.level });
    }

    // 6. Check if Activity is Complete
    const allQuestionsAnswered = activity.questions.every((q) =>
      session.answeredQuestionIds.includes(q.id)
    );

    if (allQuestionsAnswered && !session.completedActivities.includes(activity.id)) {
      session.completedActivities.push(activity.id);
      updateSession(sessionId, {
        completedActivities: session.completedActivities,
      });
    }

    // Check if review is recommended
    const shouldReview = needsReview(
      session.recentAssessedAnswers,
      activity.topic
    );

    // Persist activity progress in DB
    await db.saveActivityProgress(profileId, activityId, {
      activityId,
      topic: activity.topic,
      level: activity.level,
      attempts: session.attemptCount,
      correctCount: session.correctAnswerCount,
      status: allQuestionsAnswered ? 'completed' : shouldReview ? 'review' : 'pending',
      updatedAt: new Date().toISOString(),
    });

    await db.saveSession(session);

    // 7. Age-Appropriate SEL Feedback
    let feedback = '';
    if (isCorrect) {
      const compliments = [
        "You got it! You worked hard on that one! 🌟",
        "Super job! That is correct! 🎉",
        "Yes! You're learning so fast! ⭐",
        "Fantastic! Spot on! 🚀",
      ];
      feedback = compliments[Math.floor(Math.random() * compliments.length)];
      if (starsEarned > 1) {
        feedback += ' 🌟 Streak bonus star earned!';
      }
    } else {
      feedback = `Good try! 😊 The answer was "${question.correctAnswer}". Every try helps you learn!`;
      if (question.hint) {
        feedback += ` (Hint: ${question.hint})`;
      }
    }

    const masteryUpdate = buildMasteryUpdate(session);

    const responsePayload: AnswerResponse = {
      correct: isCorrect,
      correctAnswer: question.correctAnswer,
      feedback,
      stars: starsEarned,
      masteryUpdate,
      levelUp: levelUpEvent,
    };

    return NextResponse.json(responsePayload, {
      headers: {
        'X-Correlation-Id': correlationId,
      },
    });
  } catch (error: unknown) {
    console.error('Answer API Error:', error);
    return NextResponse.json(
      {
        error: 'An internal server error occurred',
        code: 'INTERNAL_ERROR',
        correlationId,
      },
      { status: 500 }
    );
  }
}
