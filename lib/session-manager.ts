// ============================================================
// LittleTalk AI - Session Management (In-Memory + Demo Mode)
// ============================================================
import { v4 as uuidv4 } from 'uuid';
import type {
  SessionContext,
  ChildProfile,
  ConversationTurn,
  AssessedAnswer,
  LearningLevel,
  ConversationMode,
  LearningTopic,
  ProgressSummary,
} from './types';

// ─── In-Memory Session Store (Demo Mode) ──────────────────
// Bounded to last 50 sessions in memory
const sessionStore = new Map<string, SessionContext>();
const profileStore = new Map<string, ChildProfile>();

const MAX_RECENT_TURNS = 6; // Keep last 6 turns (bounded context)
const MAX_ASSESSED_ANSWERS = 20; // Keep last 20 answers (bounded)

// ─── Profile Management ────────────────────────────────────

export function createProfile(nickname?: string): ChildProfile {
  const profileId = uuidv4();
  const now = new Date().toISOString();

  const profile: ChildProfile = {
    profileId,
    nickname: nickname?.substring(0, 20), // Limit nickname length
    currentLevel: 1,
    preferences: {},
    progressSummary: {
      totalAnswered: 0,
      totalCorrect: 0,
      streakCount: 0,
      topicProgress: {},
      level1Mastered: false,
      level2Mastered: false,
      starsEarned: 0,
    },
    createdAt: now,
    updatedAt: now,
  };

  profileStore.set(profileId, profile);
  return profile;
}

export function getProfile(profileId: string): ChildProfile | null {
  return profileStore.get(profileId) ?? null;
}

export function updateProfile(
  profileId: string,
  updates: Partial<ChildProfile>
): ChildProfile | null {
  const profile = profileStore.get(profileId);
  if (!profile) return null;

  const updated: ChildProfile = {
    ...profile,
    ...updates,
    profileId: profile.profileId, // Never allow changing profileId
    updatedAt: new Date().toISOString(),
  };
  profileStore.set(profileId, updated);
  return updated;
}

// ─── Session Management ────────────────────────────────────

export function createSession(
  profileId: string,
  level: LearningLevel = 1,
  customSessionId?: string
): SessionContext {
  const sessionId = customSessionId || uuidv4();
  const now = new Date().toISOString();

  const session: SessionContext = {
    sessionId,
    profileId,
    currentMode: 'LEARNING',
    currentLevel: level,
    attemptCount: 0,
    correctAnswerCount: 0,
    recentTurns: [],
    completedActivities: [],
    recentTopics: [],
    lastInteractionAt: now,
    recentAssessedAnswers: [],
    answeredQuestionIds: [],
  };

  sessionStore.set(sessionId, session);
  return session;
}

export function getSession(sessionId: string): SessionContext | null {
  return sessionStore.get(sessionId) ?? null;
}

export function updateSession(
  sessionId: string,
  updates: Partial<SessionContext>
): SessionContext | null {
  const session = sessionStore.get(sessionId);
  if (!session) return null;

  const updated: SessionContext = {
    ...session,
    ...updates,
    sessionId: session.sessionId, // Never change sessionId
    lastInteractionAt: new Date().toISOString(),
  };
  sessionStore.set(sessionId, updated);
  return updated;
}

export function addTurn(
  sessionId: string,
  turn: ConversationTurn
): SessionContext | null {
  const session = sessionStore.get(sessionId);
  if (!session) return null;

  const recentTurns = [...session.recentTurns, turn].slice(-MAX_RECENT_TURNS);
  return updateSession(sessionId, { recentTurns });
}

export function addAssessedAnswer(
  sessionId: string,
  answer: AssessedAnswer
): SessionContext | null {
  const session = sessionStore.get(sessionId);
  if (!session) return null;

  // Idempotency: don't add duplicate question answers
  if (session.answeredQuestionIds.includes(answer.questionId)) {
    return session; // Return existing session unchanged
  }

  const recentAssessedAnswers = [
    ...session.recentAssessedAnswers,
    answer,
  ].slice(-MAX_ASSESSED_ANSWERS);

  const answeredQuestionIds = [
    ...session.answeredQuestionIds,
    answer.questionId,
  ];

  const updates: Partial<SessionContext> = {
    recentAssessedAnswers,
    answeredQuestionIds,
    attemptCount: session.attemptCount + 1,
    correctAnswerCount: answer.correct
      ? session.correctAnswerCount + 1
      : session.correctAnswerCount,
  };

  return updateSession(sessionId, updates);
}

export function resetSession(sessionId: string): SessionContext | null {
  const session = sessionStore.get(sessionId);
  if (!session) return null;

  // Reset conversational state but keep profile link
  return updateSession(sessionId, {
    currentMode: 'LEARNING',
    currentActivityId: undefined,
    currentQuestionId: undefined,
    recentTurns: [],
    attemptCount: 0,
    // NOTE: Keep completedActivities and recentAssessedAnswers for progress tracking
  });
}

export function deleteSession(sessionId: string): void {
  sessionStore.delete(sessionId);
}

// ─── Demo Mode Indicator ───────────────────────────────────

/**
 * Returns true if running in demo mode (no Firebase credentials).
 * IMPORTANT: Always clearly label demo data as not persisted remotely.
 */
export function isDemoMode(): boolean {
  return !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === 'demo-project';
}

// ─── Anonymous Profile ─────────────────────────────────────

export function getOrCreateAnonymousProfile(): ChildProfile {
  const anonymousId = 'anonymous-demo';
  const existing = profileStore.get(anonymousId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const profile: ChildProfile = {
    profileId: anonymousId,
    currentLevel: 1,
    preferences: {},
    progressSummary: {
      totalAnswered: 0,
      totalCorrect: 0,
      streakCount: 0,
      topicProgress: {},
      level1Mastered: false,
      level2Mastered: false,
      starsEarned: 0,
    },
    createdAt: now,
    updatedAt: now,
  };

  profileStore.set(anonymousId, profile);
  return profile;
}

// ─── Progress Calculation ──────────────────────────────────

export function calculateProgressSummary(
  session: SessionContext
): ProgressSummary {
  const answers = session.recentAssessedAnswers;
  const correct = answers.filter((a) => a.correct).length;

  // Calculate topic progress
  const topicProgress: Partial<Record<LearningTopic, { topic: LearningTopic; attempts: number; correct: number; lastAttemptAt: string }>> = {};

  for (const answer of answers) {
    if (!topicProgress[answer.topic]) {
      topicProgress[answer.topic] = {
        topic: answer.topic,
        attempts: 0,
        correct: 0,
        lastAttemptAt: answer.timestamp,
      };
    }
    topicProgress[answer.topic]!.attempts++;
    if (answer.correct) topicProgress[answer.topic]!.correct++;
    topicProgress[answer.topic]!.lastAttemptAt = answer.timestamp;
  }

  // Check mastery
  const level1Answers = answers.filter((a) => a.level === 1);
  const level2Answers = answers.filter((a) => a.level === 2);
  const level1Mastered = level1Answers.length >= 10 &&
    level1Answers.filter((a) => a.correct).length / level1Answers.length >= 0.8;
  const level2Mastered = level2Answers.length >= 10 &&
    level2Answers.filter((a) => a.correct).length / level2Answers.length >= 0.8;

  return {
    totalAnswered: answers.length,
    totalCorrect: correct,
    streakCount: calculateCurrentStreak(answers),
    topicProgress,
    level1Mastered,
    level2Mastered,
    starsEarned: correct,
  };
}

function calculateCurrentStreak(answers: AssessedAnswer[]): number {
  let streak = 0;
  for (let i = answers.length - 1; i >= 0; i--) {
    if (answers[i].correct) streak++;
    else break;
  }
  return streak;
}
