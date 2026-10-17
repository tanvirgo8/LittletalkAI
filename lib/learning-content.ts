// ============================================================
// LittleTalk AI - Relational Database Curriculum Content
// Connected to SQLite Database Tables (activities & questions)
// Mock data removed — all records served from persistent DB tables
// ============================================================
import type { Activity, LearningLevel, LearningTopic } from './types';
import {
  getAllActivitiesFromDb,
  getActivityByIdFromDb,
  getActivitiesByLevelFromDb,
  getActivitiesByTopicFromDb,
  getNextActivityFromDb,
  getReviewActivityFromDb,
} from './sqlite-db';

/**
 * Data source declaration
 */
export const DATA_SOURCE = 'DATABASE_TABLES';

/**
 * Get all activities directly from SQLite database tables
 */
export function getAllActivities(): Activity[] {
  return getAllActivitiesFromDb();
}

/**
 * Static-compatible array retrieved dynamically from SQLite
 */
export const ALL_ACTIVITIES: Activity[] = getAllActivitiesFromDb();

/**
 * Fetch activities for a specific age/skill level from SQLite table
 */
export function getActivitiesByLevel(level: LearningLevel): Activity[] {
  return getActivitiesByLevelFromDb(level);
}

/**
 * Fetch activities for a specific curriculum topic from SQLite table
 */
export function getActivitiesByTopic(topic: LearningTopic): Activity[] {
  return getActivitiesByTopicFromDb(topic);
}

/**
 * Fetch single activity by primary key ID from SQLite table
 */
export function getActivityById(id: string): Activity | undefined {
  return getActivityByIdFromDb(id);
}

/**
 * Determine the next progressive activity for a child from SQLite table
 */
export function getNextActivity(
  level: LearningLevel,
  completedIds: string[],
  preferredTopic?: LearningTopic
): Activity | undefined {
  return getNextActivityFromDb(level, completedIds, preferredTopic);
}

/**
 * Retrieve review activity for reinforcing weak topics from SQLite table
 */
export function getReviewActivity(
  level: LearningLevel,
  weakTopic: LearningTopic
): Activity | undefined {
  return getReviewActivityFromDb(level, weakTopic);
}

export { TOPIC_LABELS, LEVEL_DESCRIPTIONS } from './types';
