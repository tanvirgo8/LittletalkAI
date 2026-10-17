// ============================================================
// LittleTalk AI - Session Management (Relational Database + Fast Cache)
// ============================================================
import { v4 as uuidv4 } from 'uuid';
import type {
  SessionContext,
  ChildProfile,
  ConversationTurn,
  AssessedAnswer,
  LearningLevel,
  LearningTopic,
  ProgressSummary,
} from './types';
import {
  saveProfileToDb,
  getProfileFromDb,
  saveSessionToDb,
  getSessionFromDb,
  addTurnToDb,
  addAssessedAnswerToDb,
} from './sqlite-db';

// ─── Fast Memory Cache & Bounded Store ─────────────────────
const sessionStore = new Map<string, SessionContext>();
const profileStore = new Map<string, ChildProfile>();

const MAX_RECENT_TURNS = 10; // Keep last 10 turns
const MAX_ASSESSED_ANSWERS = 30; // Keep last 30 answers

// ─── Profile Management ────────────────────────────────────

export function createProfile(nickname?: string): ChildProfile {
  const profileId = uuidv4();
  const now = new Date().toISOString();

  const profile: ChildProfile = {
    profileId,
    nickname: nickname?.substring(0, 20),
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
  try {
    saveProfileToDb(profile);
  } catch (err) {
    console.warn('SQLite saveProfile non-fatal notice:', err);
  }

  return profile;
}

export function getProfile(profileId: string): ChildProfile | null {
  const cached = profileStore.get(profileId);
  if (cached) return cached;

  try {
    const fromDb = getProfileFromDb(profileId);
    if (fromDb) {
      profileStore.set(profileId, fromDb);
      return fromDb;
    }
  } catch (err) {
    console.warn('SQLite getProfile notice:', err);
  }

  return null;
}

export function updateProfile(
  profileId: string,
  updates: Partial<ChildProfile>
): ChildProfile | null {
  const profile = getProfile(profileId);
  if (!profile) return null;

  const updated: ChildProfile = {
    ...profile,
    ...updates,
    profileId: profile.profileId,
    updatedAt: new Date().toISOString(),
  };

  profileStore.set(profileId, updated);
  try {
    saveProfileToDb(updated);
  } catch (err) {
    console.warn('SQLite updateProfile non-fatal notice:', err);
  }

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
  try {
    saveSessionToDb(session);
  } catch (err) {
    console.warn('SQLite saveSession non-fatal notice:', err);
  }

  return session;
}

export function getSession(sessionId: string): SessionContext | null {
  const cached = sessionStore.get(sessionId);
  if (cached) return cached;

  try {
    const fromDb = getSessionFromDb(sessionId);
    if (fromDb) {
      sessionStore.set(sessionId, fromDb);
      return fromDb;
    }
  } catch (err) {
    console.warn('SQLite getSession notice:', err);
  }

  return null;
}

export function updateSession(
  sessionId: string,
  updates: Partial<SessionContext>
): SessionContext | null {
  const session = getSession(sessionId);
  if (!session) return null;

  const updated: SessionContext = {
    ...session,
    ...updates,
    sessionId: session.sessionId,
    lastInteractionAt: new Date().toISOString(),
  };

  sessionStore.set(sessionId, updated);
  try {
    saveSessionToDb(updated);
  } catch (err) {
    console.warn('SQLite updateSession non-fatal notice:', err);
  }

  return updated;
}

export function addTurn(
  sessionId: string,
  turn: ConversationTurn
): SessionContext | null {
  const session = getSession(sessionId);
  if (!session) return null;

  const recentTurns = [...session.recentTurns, turn].slice(-MAX_RECENT_TURNS);

  try {
    addTurnToDb(sessionId, turn);
  } catch (err) {
    console.warn('SQLite addTurn non-fatal notice:', err);
  }

  return updateSession(sessionId, { recentTurns });
}

export function addAssessedAnswer(
  sessionId: string,
  answer: AssessedAnswer
): SessionContext | null {
  const session = getSession(sessionId);
  if (!session) return null;

  if (session.answeredQuestionIds.includes(answer.questionId)) {
    return session;
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

  try {
    addAssessedAnswerToDb(sessionId, { ...answer, profileId: session.profileId });
  } catch (err) {
    console.warn('SQLite addAssessedAnswer non-fatal notice:', err);
  }

  return updateSession(sessionId, updates);
}

export function resetSession(sessionId: string): SessionContext | null {
  const session = getSession(sessionId);
  if (!session) return null;

  return updateSession(sessionId, {
    currentMode: 'LEARNING',
    currentActivityId: undefined,
    currentQuestionId: undefined,
    recentTurns: [],
    attemptCount: 0,
  });
}

export function deleteSession(sessionId: string): void {
  sessionStore.delete(sessionId);
}

// ─── Persistence Mode Indicator ────────────────────────────

export function isDemoMode(): boolean {
  return false; // Persistent via SQLite and Firebase
}

// ─── Anonymous Profile ─────────────────────────────────────

export function getOrCreateAnonymousProfile(): ChildProfile {
  const anonymousId = 'anonymous-demo';
  const existing = getProfile(anonymousId);
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
  try {
    saveProfileToDb(profile);
  } catch {}

  return profile;
}

// ─── Progress Calculation ──────────────────────────────────

export function calculateProgressSummary(
  session: SessionContext
): ProgressSummary {
  const answers = session.recentAssessedAnswers;
  const correct = answers.filter((a) => a.correct).length;

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
