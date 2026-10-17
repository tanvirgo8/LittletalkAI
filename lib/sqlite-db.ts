// ============================================================
// LittleTalk AI - Persistent SQLite Relational Database Engine
// Designed with relational schemas, foreign keys, and indexes
// Features Vercel serverless /tmp path detection & in-memory failover
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
let isFallbackMode = false;

// Declare Webpack's __non_webpack_require__ for Node runtime bypass
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const __non_webpack_require__: ((id: string) => any) | undefined;

const INITIAL_DICT_ENTRIES: [string, string, string][] = [
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

// ─── In-Memory Relational Fallback Store ──────────────────────
// Used seamlessly if node:sqlite is missing (e.g. Node 20) or filesystem is strictly read-only
const fallbackStore = {
  activities: new Map<string, Activity>(),
  questions: new Map<string, any[]>(),
  profiles: new Map<string, ChildProfile>(),
  sessions: new Map<string, SessionContext>(),
  turns: [] as Array<{ id: number; sessionId: string; role: string; content: string; mode: string; timestamp: string }>,
  progress: new Map<string, ActivityProgressData>(),
  answers: [] as Array<AssessedAnswer & { sessionId: string; profileId?: string }>,
  dictionary: new Map<string, { word: string; definition: string; category: string }>(),
};

function initFallbackData(): void {
  if (fallbackStore.activities.size > 0) return;

  for (const act of INITIAL_CURRICULUM_SEED) {
    fallbackStore.activities.set(act.id, act);
    fallbackStore.questions.set(act.id, act.questions);
  }

  for (const [w, d, c] of INITIAL_DICT_ENTRIES) {
    fallbackStore.dictionary.set(w, { word: w, definition: d, category: c });
  }
}

function getDatabaseSyncClass(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nativeReq = typeof __non_webpack_require__ !== 'undefined'
      ? __non_webpack_require__
      : eval('require');
    const sqlite = nativeReq('node:sqlite');
    return sqlite?.DatabaseSync || null;
  } catch (err) {
    console.warn('[SQLite Engine] node:sqlite could not be loaded dynamically:', err);
    return null;
  }
}

function createTables(db: any): void {
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

  // Indexes for Performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_questions_activity ON questions(activity_id);
    CREATE INDEX IF NOT EXISTS idx_activities_level_topic ON activities(level, topic);
    CREATE INDEX IF NOT EXISTS idx_turns_session ON conversation_turns(session_id);
    CREATE INDEX IF NOT EXISTS idx_progress_profile ON activity_progress(profile_id);
    CREATE INDEX IF NOT EXISTS idx_assessed_session ON assessed_answers(session_id);
  `);
}

/**
 * Get or initialize the SQLite singleton database instance with serverless tolerance
 */
export function getSqliteDb(): any {
  if (dbInstance) return dbInstance;
  if (isFallbackMode) return null;

  try {
    const DatabaseClass = getDatabaseSyncClass();
    if (!DatabaseClass) {
      console.warn('[SQLite Engine] node:sqlite unavailable in this environment. Using in-memory fallback store.');
      isFallbackMode = true;
      initFallbackData();
      return null;
    }

    // Determine safe writable database file path
    // On Vercel / AWS Lambda, process.cwd() is read-only (/var/task). /tmp is the only writable directory.
    const isServerless = Boolean(
      process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT
    );

    let dbPath: string;
    if (isServerless) {
      dbPath = path.join('/tmp', 'littletalk.db');
    } else {
      const dataDir = path.join(process.cwd(), 'data');
      try {
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        dbPath = path.join(dataDir, 'littletalk.db');
      } catch {
        // Fall back to /tmp if local cwd is read-only
        dbPath = path.join('/tmp', 'littletalk.db');
      }
    }

    let db: any;
    try {
      db = new DatabaseClass(dbPath);
    } catch (openErr) {
      console.warn(`[SQLite Engine] Failed to open ${dbPath}, falling back to in-memory SQLite:`, openErr);
      try {
        db = new DatabaseClass(':memory:');
      } catch (memErr) {
        console.warn('[SQLite Engine] Failed to open in-memory SQLite, using fallback store:', memErr);
        isFallbackMode = true;
        initFallbackData();
        return null;
      }
    }

    // Enable WAL, busy timeout, and foreign keys for high concurrent access
    try {
      db.exec('PRAGMA journal_mode = WAL;');
      db.exec('PRAGMA busy_timeout = 5000;');
      db.exec('PRAGMA foreign_keys = ON;');
    } catch {}

    createTables(db);
    seedInitialDataIfEmpty(db);

    dbInstance = db;
    return db;
  } catch (err) {
    console.warn('[SQLite Engine] Initialization error, falling back to in-memory store:', err);
    isFallbackMode = true;
    initFallbackData();
    return null;
  }
}

/**
 * Seed curriculum and dictionary data into tables if not already populated
 */
function seedInitialDataIfEmpty(db: any): void {
  try {
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
      for (const [word, def, cat] of INITIAL_DICT_ENTRIES) {
        insertDict.run(word, def, cat);
      }
    }
  } catch (e) {
    console.warn('[SQLite Engine] Error seeding initial data:', e);
  }
}

// ─── Query Functions: Activities & Questions ────────────────

export function getAllActivitiesFromDb(): Activity[] {
  try {
    const db = getSqliteDb();
    if (db) {
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
  } catch (err) {
    console.warn('[SQLite Engine] Error in getAllActivitiesFromDb, using fallback store:', err);
  }

  initFallbackData();
  return Array.from(fallbackStore.activities.values());
}

export function getActivityByIdFromDb(id: string): Activity | undefined {
  try {
    const db = getSqliteDb();
    if (db) {
      const actRow = db.prepare('SELECT * FROM activities WHERE id = ?').get(id) as any;
      if (actRow) {
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
    }
  } catch (err) {
    console.warn('[SQLite Engine] Error in getActivityByIdFromDb, using fallback store:', err);
  }

  initFallbackData();
  return fallbackStore.activities.get(id);
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
  initFallbackData();
  fallbackStore.profiles.set(profile.profileId, { ...profile });

  try {
    const db = getSqliteDb();
    if (db) {
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
  } catch (err) {
    console.warn('[SQLite Engine] Error in saveProfileToDb:', err);
  }
}

export function getProfileFromDb(profileId: string): ChildProfile | null {
  try {
    const db = getSqliteDb();
    if (db) {
      const row = db.prepare('SELECT * FROM child_profiles WHERE profile_id = ?').get(profileId) as any;
      if (row) {
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
    }
  } catch (err) {
    console.warn('[SQLite Engine] Error in getProfileFromDb, using fallback store:', err);
  }

  initFallbackData();
  return fallbackStore.profiles.get(profileId) || null;
}

export function deleteProfileFromDb(profileId: string): void {
  initFallbackData();
  fallbackStore.profiles.delete(profileId);
  fallbackStore.sessions.delete(profileId);
  fallbackStore.progress.delete(profileId);

  try {
    const db = getSqliteDb();
    if (db) {
      db.prepare('DELETE FROM child_profiles WHERE profile_id = ?').run(profileId);
      db.prepare('DELETE FROM learning_sessions WHERE profile_id = ?').run(profileId);
      db.prepare('DELETE FROM activity_progress WHERE profile_id = ?').run(profileId);
    }
  } catch (err) {
    console.warn('[SQLite Engine] Error in deleteProfileFromDb:', err);
  }
}

// ─── Learning Sessions Persistence ─────────────────────────

export function saveSessionToDb(session: SessionContext): void {
  initFallbackData();
  fallbackStore.sessions.set(session.sessionId, { ...session });

  try {
    const db = getSqliteDb();
    if (db) {
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
  } catch (err) {
    console.warn('[SQLite Engine] Error in saveSessionToDb:', err);
  }
}

export function getSessionFromDb(sessionId: string): SessionContext | null {
  try {
    const db = getSqliteDb();
    if (db) {
      const row = db.prepare('SELECT * FROM learning_sessions WHERE session_id = ?').get(sessionId) as any;
      if (row) {
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
    }
  } catch (err) {
    console.warn('[SQLite Engine] Error in getSessionFromDb, using fallback store:', err);
  }

  initFallbackData();
  const session = fallbackStore.sessions.get(sessionId);
  if (!session) return null;

  const turns = fallbackStore.turns
    .filter((t) => t.sessionId === sessionId)
    .slice(-10)
    .map((t) => ({
      role: t.role as 'child' | 'bot',
      content: t.content,
      mode: t.mode as any,
      timestamp: t.timestamp,
    }));

  return {
    ...session,
    recentTurns: turns,
  };
}

// ─── Conversation Turns Persistence ────────────────────────

export function addTurnToDb(sessionId: string, turn: ConversationTurn): void {
  initFallbackData();
  fallbackStore.turns.push({
    id: fallbackStore.turns.length + 1,
    sessionId,
    role: turn.role,
    content: turn.content,
    mode: turn.mode || 'CONVERSATION',
    timestamp: turn.timestamp,
  });

  try {
    const db = getSqliteDb();
    if (db) {
      const stmt = db.prepare(`
        INSERT INTO conversation_turns (session_id, role, content, mode, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(sessionId, turn.role, turn.content, turn.mode || 'CONVERSATION', turn.timestamp);
    }
  } catch (err) {
    console.warn('[SQLite Engine] Error in addTurnToDb:', err);
  }
}

// ─── Activity Progress Persistence ─────────────────────────

export function saveActivityProgressToDb(
  profileId: string,
  activityId: string,
  data: ActivityProgressData
): void {
  const id = `${profileId}_${activityId}`;
  initFallbackData();
  fallbackStore.progress.set(id, { ...data });

  try {
    const db = getSqliteDb();
    if (db) {
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
  } catch (err) {
    console.warn('[SQLite Engine] Error in saveActivityProgressToDb:', err);
  }
}

export function getActivityProgressFromDb(
  profileId: string,
  activityId: string
): ActivityProgressData | null {
  const id = `${profileId}_${activityId}`;
  try {
    const db = getSqliteDb();
    if (db) {
      const row = db.prepare('SELECT * FROM activity_progress WHERE id = ?').get(id) as any;
      if (row) {
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
    }
  } catch (err) {
    console.warn('[SQLite Engine] Error in getActivityProgressFromDb, using fallback store:', err);
  }

  initFallbackData();
  return fallbackStore.progress.get(id) || null;
}

// ─── Assessed Answers Persistence ──────────────────────────

export function addAssessedAnswerToDb(
  sessionId: string,
  record: AssessedAnswer & { profileId?: string }
): void {
  initFallbackData();
  fallbackStore.answers.push({ ...record, sessionId });

  try {
    const db = getSqliteDb();
    if (db) {
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
  } catch (err) {
    console.warn('[SQLite Engine] Error in addAssessedAnswerToDb:', err);
  }
}

// ─── Database Diagnostics & Stats ──────────────────────────

export function getDatabaseStats(): DatabaseStats {
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
  );
  const activePath = isServerless ? '/tmp/littletalk.db' : path.join(process.cwd(), 'data', 'littletalk.db');

  let db: any = null;
  try {
    db = getSqliteDb();
  } catch {}

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

  initFallbackData();

  const getFallbackCount = (name: string): number => {
    switch (name) {
      case 'activities': return fallbackStore.activities.size;
      case 'questions': {
        let total = 0;
        for (const qs of fallbackStore.questions.values()) total += qs.length;
        return total;
      }
      case 'child_profiles': return fallbackStore.profiles.size;
      case 'learning_sessions': return fallbackStore.sessions.size;
      case 'conversation_turns': return fallbackStore.turns.length;
      case 'activity_progress': return fallbackStore.progress.size;
      case 'assessed_answers': return fallbackStore.answers.length;
      case 'dictionary_knowledge': return fallbackStore.dictionary.size;
      default: return 0;
    }
  };

  const tableStats = tables.map((t) => {
    if (db) {
      try {
        const row = db.prepare(`SELECT COUNT(*) as count FROM ${t.name}`).get() as any;
        return {
          name: t.name,
          rowCount: Number(row?.count || 0),
          description: t.desc,
        };
      } catch {}
    }
    return {
      name: t.name,
      rowCount: getFallbackCount(t.name),
      description: t.desc,
    };
  });

  return {
    engine: 'SQLite 3 (Built-in Relational Storage)',
    filePath: activePath,
    isPersistent: true,
    totalTables: tables.length,
    tables: tableStats,
    lastSyncedAt: new Date().toISOString(),
  };
}

export function getTableRecords(tableName: string, limit: number = 20): any[] {
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
    const db = getSqliteDb();
    if (db) {
      return db.prepare(`SELECT * FROM ${tableName} ORDER BY rowid DESC LIMIT ?`).all(limit) as any[];
    }
  } catch (err) {
    console.warn(`[SQLite Engine] Failed to get SQLite records for ${tableName}, using fallback:`, err);
  }

  initFallbackData();

  switch (tableName) {
    case 'activities':
      return Array.from(fallbackStore.activities.values()).slice(0, limit);
    case 'questions': {
      const allQ: any[] = [];
      for (const [actId, qs] of fallbackStore.questions.entries()) {
        for (const q of qs) {
          allQ.push({ activity_id: actId, ...q });
        }
      }
      return allQ.slice(0, limit);
    }
    case 'child_profiles':
      return Array.from(fallbackStore.profiles.values()).slice(0, limit);
    case 'learning_sessions':
      return Array.from(fallbackStore.sessions.values()).slice(0, limit);
    case 'conversation_turns':
      return [...fallbackStore.turns].reverse().slice(0, limit);
    case 'activity_progress':
      return Array.from(fallbackStore.progress.values()).slice(0, limit);
    case 'assessed_answers':
      return [...fallbackStore.answers].reverse().slice(0, limit);
    case 'dictionary_knowledge':
      return Array.from(fallbackStore.dictionary.values()).slice(0, limit);
    default:
      return [];
  }
}
