// ============================================================
// LittleTalk AI - Mastery & Progression Engine
// Deterministic, testable, configurable
// ============================================================
import type {
  AssessedAnswer,
  LearningLevel,
  LearningTopic,
  MasteryConfig,
  MasteryUpdate,
  LevelUpEvent,
  SessionContext,
} from './types';
import { DEFAULT_MASTERY_CONFIG } from './types';

// ─── Mastery Calculation ───────────────────────────────────

/**
 * Calculate mastery percentage from recent assessed answers.
 * Uses only the last N answers (bounded window).
 */
export function calculateMastery(
  answers: AssessedAnswer[],
  config: MasteryConfig = DEFAULT_MASTERY_CONFIG
): number {
  if (answers.length === 0) return 0;

  // Use only last N answers
  const window = answers.slice(-config.minAssessedAnswers);
  const correct = window.filter((a) => a.correct).length;
  return correct / window.length;
}

/**
 * Calculate topic-specific mastery for a given topic.
 */
export function calculateTopicMastery(
  answers: AssessedAnswer[],
  topic: LearningTopic,
  windowSize: number = 5
): number {
  const topicAnswers = answers.filter((a) => a.topic === topic);
  if (topicAnswers.length === 0) return 0;
  const window = topicAnswers.slice(-windowSize);
  const correct = window.filter((a) => a.correct).length;
  return correct / window.length;
}

/**
 * Determine if a child has met the mastery threshold for level advancement.
 * Rules:
 * 1. Must have at least minAssessedAnswers assessed answers
 * 2. Must be at or above threshold (default 80%)
 * 3. Never advance purely based on conversation messages
 */
export function hasMasteredLevel(
  answers: AssessedAnswer[],
  level: LearningLevel,
  config: MasteryConfig = DEFAULT_MASTERY_CONFIG
): boolean {
  const levelAnswers = answers.filter((a) => a.level === level);

  // Must have minimum assessed answers for this level
  if (levelAnswers.length < config.minAssessedAnswers) return false;

  const mastery = calculateMastery(levelAnswers, config);
  return mastery >= config.threshold;
}

/**
 * Determine if the child should advance to the next level.
 * Returns the new level (or same level if not ready).
 * IMPORTANT: Only call this after an assessed answer, never after conversation.
 */
export function determineNextLevel(
  currentLevel: LearningLevel,
  answers: AssessedAnswer[],
  config: MasteryConfig = DEFAULT_MASTERY_CONFIG
): { level: LearningLevel; levelUp: boolean } {
  // Max level is 3
  if (currentLevel >= 3) {
    return { level: 3, levelUp: false };
  }

  if (hasMasteredLevel(answers, currentLevel, config)) {
    const nextLevel = (currentLevel + 1) as LearningLevel;
    return { level: nextLevel, levelUp: true };
  }

  return { level: currentLevel, levelUp: false };
}

/**
 * Build a LevelUpEvent for display.
 */
export function buildLevelUpEvent(
  fromLevel: LearningLevel,
  toLevel: LearningLevel
): LevelUpEvent {
  const messages: Record<string, string> = {
    '1-2': "Amazing! 🌟 You reached Level 2! You've learned so many words! Now let's try short sentences!",
    '2-3': "Wow, superstar! 🚀 You reached Level 3! You're ready for real conversations! Let's go!",
  };
  return {
    fromLevel,
    toLevel,
    message: messages[`${fromLevel}-${toLevel}`] || `Great job! You leveled up to Level ${toLevel}! 🎉`,
  };
}

/**
 * Determine if review is needed based on recent performance.
 */
export function needsReview(
  answers: AssessedAnswer[],
  topic: LearningTopic,
  config: MasteryConfig = DEFAULT_MASTERY_CONFIG
): boolean {
  const recentTopicAnswers = answers
    .filter((a) => a.topic === topic)
    .slice(-config.reviewQuestionCount);

  if (recentTopicAnswers.length < 2) return false;

  const mastery = recentTopicAnswers.filter((a) => a.correct).length / recentTopicAnswers.length;
  return mastery < config.reviewTriggerThreshold;
}

/**
 * Find the weakest topic for a given level (for review).
 */
export function findWeakestTopic(
  answers: AssessedAnswer[],
  level: LearningLevel
): LearningTopic | undefined {
  const levelAnswers = answers.filter((a) => a.level === level);

  const topicGroups: Partial<Record<LearningTopic, AssessedAnswer[]>> = {};
  for (const answer of levelAnswers) {
    if (!topicGroups[answer.topic]) topicGroups[answer.topic] = [];
    topicGroups[answer.topic]!.push(answer);
  }

  let weakestTopic: LearningTopic | undefined;
  let lowestMastery = 1;

  for (const [topic, topicAnswers] of Object.entries(topicGroups)) {
    if (!topicAnswers || topicAnswers.length < 2) continue;
    const mastery = topicAnswers.filter((a) => a.correct).length / topicAnswers.length;
    if (mastery < lowestMastery) {
      lowestMastery = mastery;
      weakestTopic = topic as LearningTopic;
    }
  }

  return weakestTopic;
}

/**
 * Check if a question has already been answered (idempotency check).
 */
export function isDuplicateAnswer(
  questionId: string,
  answeredIds: string[]
): boolean {
  return answeredIds.includes(questionId);
}

/**
 * Score an answer deterministically.
 * Returns true if the child's answer matches the correct answer.
 * Matching is case-insensitive and trims whitespace.
 * For conversation prompts, checks if answer starts with expected prefix.
 */
export function scoreAnswer(
  childAnswer: string,
  correctAnswer: string,
  isConversationPrompt: boolean = false
): boolean {
  const normalizedChild = childAnswer.trim().toLowerCase();
  const normalizedCorrect = correctAnswer.trim().toLowerCase();

  if (isConversationPrompt) {
    // For open-ended questions, check if it starts with the expected prefix
    return normalizedChild.startsWith(normalizedCorrect);
  }

  return normalizedChild === normalizedCorrect;
}

/**
 * Build a MasteryUpdate object for API responses.
 */
export function buildMasteryUpdate(
  context: SessionContext,
  config: MasteryConfig = DEFAULT_MASTERY_CONFIG
): MasteryUpdate {
  const levelAnswers = context.recentAssessedAnswers.filter(
    (a) => a.level === context.currentLevel
  );
  const mastery = calculateMastery(levelAnswers, config);

  return {
    currentLevel: context.currentLevel,
    masteryPercent: Math.round(mastery * 100),
    answeredCount: levelAnswers.length,
    requiredCount: config.minAssessedAnswers,
  };
}

/**
 * Calculate stars earned for an interaction.
 * Correct answers earn 1 star, perfect streaks earn bonus stars.
 */
export function calculateStarsEarned(
  correct: boolean,
  recentAnswers: AssessedAnswer[]
): number {
  if (!correct) return 0;

  // Check for streak bonus
  const recentCorrect = recentAnswers.slice(-4).every((a) => a.correct);
  if (recentCorrect && recentAnswers.length >= 4) {
    return 2; // Bonus star for streak
  }

  return 1;
}

/**
 * Calculate total stars earned from all assessed answers.
 */
export function calculateTotalStars(answers: AssessedAnswer[]): number {
  return answers.filter((a) => a.correct).length;
}
