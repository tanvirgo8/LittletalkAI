// ============================================================
// LittleTalk AI - Relational Database Integration Tests
// Verifies table schema design, persistence, and live data queries
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  getDatabaseStats,
  getAllActivitiesFromDb,
  getActivityByIdFromDb,
  getTableRecords,
  saveProfileToDb,
  getProfileFromDb,
  saveSessionToDb,
  getSessionFromDb,
  addTurnToDb,
} from '@/lib/sqlite-db';
import { ALL_ACTIVITIES, getActivityById } from '@/lib/learning-content';
import { getDatabaseAdapter } from '@/lib/db-adapter';
import { GET as databaseHandler } from '@/app/api/database/route';

describe('Database Architecture & Live Table Tests', () => {
  it('1. Initializes persistent SQLite database with designed relational tables', () => {
    const stats = getDatabaseStats();

    expect(stats.isPersistent).toBe(true);
    expect(stats.engine).toContain('SQLite 3');
    expect(stats.totalTables).toBe(8);

    const tableNames = stats.tables.map((t) => t.name);
    expect(tableNames).toContain('activities');
    expect(tableNames).toContain('questions');
    expect(tableNames).toContain('child_profiles');
    expect(tableNames).toContain('learning_sessions');
    expect(tableNames).toContain('conversation_turns');
    expect(tableNames).toContain('activity_progress');
    expect(tableNames).toContain('assessed_answers');
    expect(tableNames).toContain('dictionary_knowledge');
  });

  it('2. Automatically seeds curriculum and dictionary data into tables', () => {
    const stats = getDatabaseStats();
    const actTable = stats.tables.find((t) => t.name === 'activities');
    const qTable = stats.tables.find((t) => t.name === 'questions');
    const dictTable = stats.tables.find((t) => t.name === 'dictionary_knowledge');

    expect(actTable?.rowCount).toBeGreaterThanOrEqual(12);
    expect(qTable?.rowCount).toBeGreaterThanOrEqual(50);
    expect(dictTable?.rowCount).toBeGreaterThanOrEqual(15);
  });

  it('3. Serves curriculum activities directly from SQLite database tables', () => {
    const activitiesFromDb = getAllActivitiesFromDb();
    expect(activitiesFromDb.length).toBeGreaterThanOrEqual(12);

    const firstAct = activitiesFromDb[0];
    expect(firstAct.id).toBeDefined();
    expect(firstAct.title).toBeDefined();
    expect(firstAct.questions.length).toBeGreaterThan(0);

    // Verify learning-content.ts queries database
    const actViaContent = getActivityById('l1-colors-1');
    expect(actViaContent).toBeDefined();
    expect(actViaContent?.title).toBe('What Color Is It?');
    expect(actViaContent?.questions[0].correctAnswer).toBe('Yellow');
  });

  it('4. Persists child profiles and sessions across database queries', () => {
    const testProfile = {
      profileId: 'test-db-child-001',
      nickname: 'Amina',
      currentLevel: 1 as const,
      preferences: { favoriteColor: 'purple' },
      progressSummary: {
        totalAnswered: 5,
        totalCorrect: 5,
        streakCount: 5,
        topicProgress: {},
        level1Mastered: false,
        level2Mastered: false,
        starsEarned: 5,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveProfileToDb(testProfile);
    const retrieved = getProfileFromDb('test-db-child-001');

    expect(retrieved).toBeDefined();
    expect(retrieved?.nickname).toBe('Amina');
    expect(retrieved?.progressSummary.starsEarned).toBe(5);

    // Persist session
    const testSession = {
      sessionId: 'test-session-db-001',
      profileId: 'test-db-child-001',
      currentMode: 'LEARNING' as const,
      currentLevel: 1 as const,
      attemptCount: 1,
      correctAnswerCount: 1,
      recentTurns: [],
      completedActivities: ['l1-colors-1'],
      recentTopics: ['colors' as const],
      lastInteractionAt: new Date().toISOString(),
      recentAssessedAnswers: [],
      answeredQuestionIds: ['l1-c1-q1'],
    };

    saveSessionToDb(testSession);
    const retrievedSession = getSessionFromDb('test-session-db-001');

    expect(retrievedSession).toBeDefined();
    expect(retrievedSession?.profileId).toBe('test-db-child-001');
    expect(retrievedSession?.completedActivities).toContain('l1-colors-1');

    // Add conversation turn
    addTurnToDb('test-session-db-001', {
      role: 'child',
      content: 'Hello Lumi!',
      mode: 'CONVERSATION',
      timestamp: new Date().toISOString(),
    });

    const sessionWithTurns = getSessionFromDb('test-session-db-001');
    expect(sessionWithTurns?.recentTurns.length).toBeGreaterThanOrEqual(1);
    expect(sessionWithTurns?.recentTurns[sessionWithTurns.recentTurns.length - 1].content).toBe('Hello Lumi!');
  });

  it('5. DatabaseAdapter reports persistent storage type', () => {
    const adapter = getDatabaseAdapter();
    expect(adapter.isPersistent()).toBe(true);
    expect(['sqlite', 'firestore']).toContain(adapter.getStorageType());
  });

  it('6. GET /api/database returns live table schemas and records', async () => {
    const reqStats = new Request('http://localhost:3000/api/database');
    const resStats = await databaseHandler(reqStats);
    expect(resStats.status).toBe(200);

    const dataStats = await resStats.json();
    expect(dataStats.success).toBe(true);
    expect(dataStats.stats.totalTables).toBe(8);

    // Query live records for activities table
    const reqTable = new Request('http://localhost:3000/api/database?table=activities');
    const resTable = await databaseHandler(reqTable);
    expect(resTable.status).toBe(200);

    const dataTable = await resTable.json();
    expect(dataTable.tableName).toBe('activities');
    expect(dataTable.recordCount).toBeGreaterThanOrEqual(12);
    expect(dataTable.records[0].id).toBeDefined();
  });
});
