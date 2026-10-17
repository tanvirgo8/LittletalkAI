// ============================================================
// LittleTalk AI - Persistent SQLite Relational Database Engine
// Designed with relational schemas, foreign keys, and indexes
// ============================================================
import fs from 'fs';
import path from 'path';
import { INITIAL_CURRICULUM_SEED } from './curriculum-seed';
import type {
  Activity,
  ChildProfile,
  SessionContext,
  ConversationTurn,
  AssessedAnswer,
  LearningLevel,
  LearningTopic,
} from './types';
import type { ActivityProgressData } from './db-adapter';

export interface DatabaseStats {
  engine: 'SQLite 3 (Built-in Relational Storage)';
  filePath: string;
  isPersistent: boolean;
  totalTables: number;
  tables: {
    name: string;
    rowCount: number;
    description: string;
  }[];
  lastSyncedAt: string;
}

let dbInstance: any = null;

// Declare Webpack's __non_webpack_require__ for Node runtime bypass
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const __non_webpack_require__: ((id: string) => any) | undefined;

function getDatabaseSyncClass(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nativeReq = typeof __non_webpack_require__ !== 'undefined'
      ? __non_webpack_require__
      : eval('require');
    const sqlite = nativeReq('node:sqlite');
    return sqlite.DatabaseSync;
  } catch (err) {
    console.error('Failed to load node:sqlite dynamically:', err);
    throw err;
  }
}

/**
 * Get or initialize the SQLite singleton database instance
 */
export function getSqliteDb(): any {
  if (dbInstance) return dbInstance;

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'littletalk.db');
  const DatabaseClass = getDatabaseSyncClass();
  const db = new DatabaseClass(dbPath);

  // Enable WAL, busy timeout, and foreign keys for high concurrent access
  try {
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA busy_timeout = 5000;');
    db.exec('PRAGMA foreign_keys = ON;');
  } catch {}

  // ─── Table Design ─────────────────────────────────────────

  // 1. Curriculum Activities Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      topic TEXT NOT NULL,
      level INTEGER NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Questions Table (Foreign Key to activities)
  db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      activity_id TEXT NOT NULL,
      question_text TEXT NOT NULL,
      image_hint TEXT,
      options_json TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      hint TEXT,
      order_index INTEGER DEFAULT 0,
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
    );
  `);

  // 3. Child Profiles Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS child_profiles (
      profile_id TEXT PRIMARY KEY,
      nickname TEXT,
      current_level INTEGER NOT NULL DEFAULT 1,
      stars_earned INTEGER NOT NULL DEFAULT 0,
      preferences_json TEXT DEFAULT '{}',
      progress_summary_json TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Learning Sessions Table (Foreign Key to child_profiles)
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_sessions (
      session_id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      current_mode TEXT NOT NULL DEFAULT 'LEARNING',
      current_topic TEXT DEFAULT 'colors',
      current_level INTEGER NOT NULL DEFAULT 1,
      current_activity_id TEXT,
      current_question_id TEXT,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      correct_answer_count INTEGER NOT NULL DEFAULT 0,
      answered_questions_json TEXT DEFAULT '[]',
      completed_activities_json TEXT DEFAULT '[]',
      recent_topics_json TEXT DEFAULT '[]',
      last_interaction_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. Conversation Turns Table (Foreign Key to learning_sessions)
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversation_turns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      mode TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES learning_sessions(session_id) ON DELETE CASCADE
    );
  `);

  // 6. Activity Progress Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_progress (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      activity_id TEXT NOT NULL,
      topic TEXT NOT NULL,
      level INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      correct_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 7. Assessed Answers Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS assessed_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      profile_id TEXT,
      activity_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      topic TEXT NOT NULL,
      level INTEGER NOT NULL,
      correct INTEGER NOT NULL,
      timestamp TEXT NOT NULL
    );
  `);

  // 8. Dictionary Knowledge Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS dictionary_knowledge (
      word TEXT PRIMARY KEY,
      definition TEXT NOT NULL,
      category TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ─── Indexes for Performance ──────────────────────────────
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_questions_activity ON questions(activity_id);
    CREATE INDEX IF NOT EXISTS idx_activities_level_topic ON activities(level, topic);
    CREATE INDEX IF NOT EXISTS idx_turns_session ON conversation_turns(session_id);
    CREATE INDEX IF NOT EXISTS idx_progress_profile ON activity_progress(profile_id);
    CREATE INDEX IF NOT EXISTS idx_assessed_session ON assessed_answers(session_id);
  `);

  // ─── Initial Data Migration & Seeding ─────────────────────
  seedInitialDataIfEmpty(db);

  dbInstance = db;
  return db;
}

/**
 * Seed curriculum and dictionary data into tables if not already populated
 */
function seedInitialDataIfEmpty(db: any): void {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM activities').get() as { count: number | bigint };
  const currentCount = Number(countRow.count);

  if (currentCount === 0) {
    const insertAct = db.prepare(
      'INSERT OR REPLACE INTO activities (id, type, topic, level, title) VALUES (?, ?, ?, ?, ?)'
    );
    const insertQ = db.prepare(
      'INSERT OR REPLACE INTO questions (id, activity_id, question_text, image_hint, options_json, correct_answer, hint, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );

    for (const act of INITIAL_CURRICULUM_SEED) {
      insertAct.run(act.id, act.type, act.topic, act.level, act.title);

      act.questions.forEach((q, idx) => {
        insertQ.run(
          q.id,
          act.id,
          q.text,
          q.imageHint || '',
          JSON.stringify(q.options || []),
          q.correctAnswer,
          q.hint || '',
          idx
        );
      });
    }
  }

  // Seed Knowledge Dictionary
  const dictRow = db.prepare('SELECT COUNT(*) as count FROM dictionary_knowledge').get() as { count: number | bigint };
  if (Number(dictRow.count) === 0) {
    const insertDict = db.prepare(
      'INSERT OR REPLACE INTO dictionary_knowledge (word, definition, category) VALUES (?, ?, ?)'
    );
    const initialDict: [string, string, string][] = [
      ['cat', 'A cute, furry pet with soft whiskers and paws! 🐱', 'animal'],
      ['dog', 'A loyal and friendly pet that wags its tail! 🐶', 'animal'],
      ['lion', 'A big, powerful wild cat with a majestic mane! 🦁', 'animal'],
      ['elephant', 'A gentle giant with big ears and a long trunk! 🐘', 'animal'],
      ['giraffe', 'The tallest animal in the world with a long neck! 🦒', 'animal'],
      ['apple', 'A sweet, crisp fruit that can be red, green, or yellow! 🍎', 'fruit'],
      ['banana', 'A sweet, soft yellow fruit that curves like a smile! 🍌', 'fruit'],
      ['sun', 'The gigantic glowing star giving us warmth and light! ☀️', 'nature'],
      ['star', 'A glowing celestial body in space, just like Lumi! 🌟', 'nature'],
      ['rainbow', 'A magical arc of 7 colors across the sky! 🌈', 'nature'],
      ['book', 'Pages filled with words and colorful illustrations! 📚', 'object'],
      ['pencil', 'A wooden tool used to write words and draw pictures! ✏️', 'object'],
      ['rocket', 'A powerful spaceship exploring the stars and planets! 🚀', 'science'],
      ['dinosaur', 'Ancient, magnificent creatures from millions of years ago! 🦖', 'science'],
      ['penguin', 'Flightless birds that slide on ice and swim underwater! 🐧', 'animal'],
    ];

    for (const [word, def, cat] of initialDict) {
      insertDict.run(word, def, cat);
    }
  }
}

// ─── Query Functions: Activities & Questions ────────────────

export function getAllActivitiesFromDb(): Activity[] {
  const db = getSqliteDb();
  const actRows = db.prepare('SELECT * FROM activities ORDER BY level ASC, id ASC').all() as any[];
  const qRows = db.prepare('SELECT * FROM questions ORDER BY order_index ASC').all() as any[];

  const questionsByAct = new Map<string, any[]>();
  for (const q of qRows) {
    let list = questionsByAct.get(q.activity_id);
    if (!list) {
      list = [];
      questionsByAct.set(q.activity_id, list);
    }
    list.push({
      id: q.id,
      text: q.question_text,
      imageHint: q.image_hint || undefined,
      options: JSON.parse(q.options_json || '[]'),
      correctAnswer: q.correct_answer,
      hint: q.hint || undefined,
    });
  }

  return actRows.map((a) => ({
    id: a.id,
    type: a.type as Activity['type'],
    topic: a.topic as LearningTopic,
    level: a.level as LearningLevel,
    title: a.title,
    questions: questionsByAct.get(a.id) || [],
  }));
}

export function getActivityByIdFromDb(id: string): Activity | undefined {
  const db = getSqliteDb();
  const actRow = db.prepare('SELECT * FROM activities WHERE id = ?').get(id) as any;
  if (!actRow) return undefined;

  const qRows = db.prepare('SELECT * FROM questions WHERE activity_id = ? ORDER BY order_index ASC').all(id) as any[];

  return {
    id: actRow.id,
    type: actRow.type as Activity['type'],
    topic: actRow.topic as LearningTopic,
    level: actRow.level as LearningLevel,
    title: actRow.title,
    questions: qRows.map((q) => ({
      id: q.id,
      text: q.question_text,
      imageHint: q.image_hint || undefined,
      options: JSON.parse(q.options_json || '[]'),
      correctAnswer: q.correct_answer,
      hint: q.hint || undefined,
    })),
  };
}

export function getActivitiesByLevelFromDb(level: LearningLevel): Activity[] {
  const all = getAllActivitiesFromDb();
  return all.filter((a) => a.level === level);
}

export function getActivitiesByTopicFromDb(topic: LearningTopic): Activity[] {
  const all = getAllActivitiesFromDb();
  return all.filter((a) => a.topic === topic);
}

export function getNextActivityFromDb(
  level: LearningLevel,
  completedIds: string[],
  preferredTopic?: LearningTopic
): Activity | undefined {
  const all = getAllActivitiesFromDb();
  const available = all.filter((a) => a.level === level && !completedIds.includes(a.id));

  if (preferredTopic) {
    const topicMatch = available.find((a) => a.topic === preferredTopic);
    if (topicMatch) return topicMatch;
  }

  return available[0];
}

export function getReviewActivityFromDb(
  level: LearningLevel,
  weakTopic: LearningTopic
): Activity | undefined {
  const all = getAllActivitiesFromDb();
  return all.find((a) => a.level === level && a.topic === weakTopic);
}

// ─── Child Profiles Persistence ────────────────────────────

export function saveProfileToDb(profile: ChildProfile): void {
  const db = getSqliteDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO child_profiles (
      profile_id, nickname, current_level, stars_earned,
      preferences_json, progress_summary_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  stmt.run(
    profile.profileId,
    profile.nickname || '',
    profile.currentLevel,
    profile.progressSummary.starsEarned || 0,
    JSON.stringify(profile.preferences || {}),
    JSON.stringify(profile.progressSummary)
  );
}

export function getProfileFromDb(profileId: string): ChildProfile | null {
  const db = getSqliteDb();
  const row = db.prepare('SELECT * FROM child_profiles WHERE profile_id = ?').get(profileId) as any;
  if (!row) return null;

  return {
    profileId: row.profile_id,
    nickname: row.nickname || undefined,
    currentLevel: row.current_level as LearningLevel,
    preferences: JSON.parse(row.preferences_json || '{}'),
    progressSummary: JSON.parse(row.progress_summary_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function deleteProfileFromDb(profileId: string): void {
  const db = getSqliteDb();
  db.prepare('DELETE FROM child_profiles WHERE profile_id = ?').run(profileId);
  db.prepare('DELETE FROM learning_sessions WHERE profile_id = ?').run(profileId);
  db.prepare('DELETE FROM activity_progress WHERE profile_id = ?').run(profileId);
}

// ─── Learning Sessions Persistence ─────────────────────────

export function saveSessionToDb(session: SessionContext): void {
  const db = getSqliteDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO learning_sessions (
      session_id, profile_id, current_mode, current_topic,
      current_level, current_activity_id, current_question_id,
      attempt_count, correct_answer_count, answered_questions_json,
      completed_activities_json, recent_topics_json,
      last_interaction_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  stmt.run(
    session.sessionId,
    session.profileId,
    session.currentMode,
    session.currentTopic || 'colors',
    session.currentLevel,
    session.currentActivityId || null,
    session.currentQuestionId || null,
    session.attemptCount,
    session.correctAnswerCount,
    JSON.stringify(session.answeredQuestionIds || []),
    JSON.stringify(session.completedActivities || []),
    JSON.stringify(session.recentTopics || []),
    session.lastInteractionAt
  );
}

export function getSessionFromDb(sessionId: string): SessionContext | null {
  const db = getSqliteDb();
  const row = db.prepare('SELECT * FROM learning_sessions WHERE session_id = ?').get(sessionId) as any;
  if (!row) return null;

  // Retrieve recent turns from conversation_turns table
  const turnRows = db.prepare(
    'SELECT * FROM conversation_turns WHERE session_id = ? ORDER BY id DESC LIMIT 10'
  ).all(sessionId) as any[];

  const turns: ConversationTurn[] = turnRows.reverse().map((t) => ({
    role: t.role as 'child' | 'bot',
    content: t.content,
    mode: t.mode as any,
    timestamp: t.timestamp,
  }));

  return {
    sessionId: row.session_id,
    profileId: row.profile_id,
    currentMode: row.current_mode as any,
    currentTopic: row.current_topic as any,
    currentLevel: row.current_level as LearningLevel,
    currentActivityId: row.current_activity_id || undefined,
    currentQuestionId: row.current_question_id || undefined,
    attemptCount: row.attempt_count,
    correctAnswerCount: row.correct_answer_count,
    answeredQuestionIds: JSON.parse(row.answered_questions_json || '[]'),
    completedActivities: JSON.parse(row.completed_activities_json || '[]'),
    recentTopics: JSON.parse(row.recent_topics_json || '[]'),
    recentTurns: turns,
    recentAssessedAnswers: [],
    lastInteractionAt: row.last_interaction_at,
  };
}

// ─── Conversation Turns Persistence ────────────────────────

export function addTurnToDb(sessionId: string, turn: ConversationTurn): void {
  const db = getSqliteDb();
  const stmt = db.prepare(`
    INSERT INTO conversation_turns (session_id, role, content, mode, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(sessionId, turn.role, turn.content, turn.mode || 'CONVERSATION', turn.timestamp);
}

// ─── Activity Progress Persistence ─────────────────────────

export function saveActivityProgressToDb(
  profileId: string,
  activityId: string,
  data: ActivityProgressData
): void {
  const db = getSqliteDb();
  const id = `${profileId}_${activityId}`;
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO activity_progress (
      id, profile_id, activity_id, topic, level, attempts, correct_count, status, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  stmt.run(
    id,
    profileId,
    activityId,
    data.topic,
    data.level,
    data.attempts,
    data.correctCount,
    data.status
  );
}

export function getActivityProgressFromDb(
  profileId: string,
  activityId: string
): ActivityProgressData | null {
  const db = getSqliteDb();
  const id = `${profileId}_${activityId}`;
  const row = db.prepare('SELECT * FROM activity_progress WHERE id = ?').get(id) as any;
  if (!row) return null;

  return {
    activityId: row.activity_id,
    topic: row.topic,
    level: row.level,
    attempts: row.attempts,
    correctCount: row.correct_count,
    status: row.status as any,
    updatedAt: row.updated_at,
  };
}

// ─── Assessed Answers Persistence ──────────────────────────

export function addAssessedAnswerToDb(
  sessionId: string,
  record: AssessedAnswer & { profileId?: string }
): void {
  const db = getSqliteDb();
  const stmt = db.prepare(`
    INSERT INTO assessed_answers (session_id, profile_id, activity_id, question_id, topic, level, correct, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    sessionId,
    record.profileId || null,
    record.activityId,
    record.questionId,
    record.topic,
    record.level,
    record.correct ? 1 : 0,
    record.timestamp
  );
}

// ─── Database Diagnostics & Stats ──────────────────────────

export function getDatabaseStats(): DatabaseStats {
  const db = getSqliteDb();
  const tables = [
    { name: 'activities', desc: 'Curriculum educational units for Levels 1, 2, 3' },
    { name: 'questions', desc: 'Child multiple choice and conversational questions' },
    { name: 'child_profiles', desc: 'Child profiles, mastery state, and earned stars' },
    { name: 'learning_sessions', desc: 'Active session contexts and learning progress' },
    { name: 'conversation_turns', desc: 'Chronological dialogue turns between child & Lumi' },
    { name: 'activity_progress', desc: 'Topic-level mastery tracking and status' },
    { name: 'assessed_answers', desc: 'Scored responses for accuracy assessment' },
    { name: 'dictionary_knowledge', desc: 'Child friendly dictionary and trivia' },
  ];

  const tableStats = tables.map((t) => {
    try {
      const row = db.prepare(`SELECT COUNT(*) as count FROM ${t.name}`).get() as any;
      return {
        name: t.name,
        rowCount: Number(row?.count || 0),
        description: t.desc,
      };
    } catch {
      return {
        name: t.name,
        rowCount: 0,
        description: t.desc,
      };
    }
  });

  return {
    engine: 'SQLite 3 (Built-in Relational Storage)',
    filePath: path.join(process.cwd(), 'data', 'littletalk.db'),
    isPersistent: true,
    totalTables: tables.length,
    tables: tableStats,
    lastSyncedAt: new Date().toISOString(),
  };
}

export function getTableRecords(tableName: string, limit: number = 20): any[] {
  const db = getSqliteDb();
  const allowed = [
    'activities',
    'questions',
    'child_profiles',
    'learning_sessions',
    'conversation_turns',
    'activity_progress',
    'assessed_answers',
    'dictionary_knowledge',
  ];

  if (!allowed.includes(tableName)) return [];

  try {
    return db.prepare(`SELECT * FROM ${tableName} ORDER BY rowid DESC LIMIT ?`).all(limit) as any[];
  } catch (err) {
    console.error(`Failed to get records for ${tableName}`, err);
    return [];
  }
}
