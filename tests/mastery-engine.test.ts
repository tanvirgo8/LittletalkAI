import { describe, it, expect } from 'vitest';
import {
  calculateMastery,
  hasMasteredLevel,
  determineNextLevel,
  needsReview,
  findWeakestTopic,
  scoreAnswer,
  isDuplicateAnswer,
  calculateStarsEarned,
  buildLevelUpEvent,
} from '@/lib/mastery-engine';
import type { AssessedAnswer, MasteryConfig } from '@/lib/types';

describe('Mastery & Progression Engine', () => {
  const customConfig: MasteryConfig = {
    threshold: 0.8,
    minAssessedAnswers: 10,
    reviewTriggerThreshold: 0.5,
    reviewQuestionCount: 3,
  };

  it('calculates mastery correctly based on the bounded window', () => {
    const answers: AssessedAnswer[] = [
      { questionId: 'q1', activityId: 'a1', correct: true, topic: 'colors', level: 1, timestamp: '1' },
      { questionId: 'q2', activityId: 'a1', correct: true, topic: 'colors', level: 1, timestamp: '2' },
      { questionId: 'q3', activityId: 'a1', correct: false, topic: 'colors', level: 1, timestamp: '3' },
      { questionId: 'q4', activityId: 'a1', correct: true, topic: 'colors', level: 1, timestamp: '4' },
    ];

    expect(calculateMastery(answers, customConfig)).toBe(0.75);
  });

  it('does NOT advance level if assessed answers are below minimum threshold count (e.g. 10)', () => {
    // 5 answers, 100% correct — but not enough answers to prove mastery
    const answers: AssessedAnswer[] = Array(5).fill(null).map((_, i) => ({
      questionId: `q${i}`,
      activityId: 'a1',
      correct: true,
      topic: 'colors',
      level: 1,
      timestamp: `${i}`,
    }));

    expect(hasMasteredLevel(answers, 1, customConfig)).toBe(false);
    const progression = determineNextLevel(1, answers, customConfig);
    expect(progression.levelUp).toBe(false);
    expect(progression.level).toBe(1);
  });

  it('advances level only when meeting >= 80% mastery across at least 10 assessed answers', () => {
    // 10 answers: 8 correct, 2 incorrect = 80% mastery
    const answers: AssessedAnswer[] = Array(10).fill(null).map((_, i) => ({
      questionId: `q${i}`,
      activityId: 'a1',
      correct: i < 8,
      topic: 'colors',
      level: 1,
      timestamp: `${i}`,
    }));

    expect(hasMasteredLevel(answers, 1, customConfig)).toBe(true);
    const progression = determineNextLevel(1, answers, customConfig);
    expect(progression.levelUp).toBe(true);
    expect(progression.level).toBe(2);
  });

  it('does not advance beyond maximum level (Level 3)', () => {
    const answers: AssessedAnswer[] = Array(12).fill(null).map((_, i) => ({
      questionId: `q${i}`,
      activityId: 'a1',
      correct: true,
      topic: 'sentences',
      level: 3,
      timestamp: `${i}`,
    }));

    const progression = determineNextLevel(3, answers, customConfig);
    expect(progression.levelUp).toBe(false);
    expect(progression.level).toBe(3);
  });

  it('triggers review when accuracy on a topic falls below review threshold', () => {
    const strugglingAnswers: AssessedAnswer[] = [
      { questionId: 'q1', activityId: 'a1', correct: false, topic: 'colors', level: 1, timestamp: '1' },
      { questionId: 'q2', activityId: 'a1', correct: false, topic: 'colors', level: 1, timestamp: '2' },
      { questionId: 'q3', activityId: 'a1', correct: true, topic: 'colors', level: 1, timestamp: '3' },
    ];

    expect(needsReview(strugglingAnswers, 'colors', customConfig)).toBe(true);
  });

  it('finds the weakest topic for personalized review activities', () => {
    const answers: AssessedAnswer[] = [
      // Animals: 2 correct out of 2 = 100%
      { questionId: 'q1', activityId: 'a1', correct: true, topic: 'animals', level: 1, timestamp: '1' },
      { questionId: 'q2', activityId: 'a1', correct: true, topic: 'animals', level: 1, timestamp: '2' },
      // Colors: 0 correct out of 2 = 0%
      { questionId: 'q3', activityId: 'a2', correct: false, topic: 'colors', level: 1, timestamp: '3' },
      { questionId: 'q4', activityId: 'a2', correct: false, topic: 'colors', level: 1, timestamp: '4' },
    ];

    expect(findWeakestTopic(answers, 1)).toBe('colors');
  });

  it('detects duplicate question answers to ensure idempotency', () => {
    const answeredIds = ['q1', 'q2', 'q3'];
    expect(isDuplicateAnswer('q1', answeredIds)).toBe(true);
    expect(isDuplicateAnswer('q4', answeredIds)).toBe(false);
  });

  it('scores answers deterministically with trimming and case-insensitivity', () => {
    expect(scoreAnswer('  Yellow ', 'yellow')).toBe(true);
    expect(scoreAnswer('Blue', 'yellow')).toBe(false);
    // Open-ended conversation prompt checking
    expect(scoreAnswer('I like dogs because they are friendly', 'I like', true)).toBe(true);
  });

  it('calculates stars earned and awards streak bonus', () => {
    expect(calculateStarsEarned(false, [])).toBe(0);
    expect(calculateStarsEarned(true, [])).toBe(1);

    // 4 correct in a row awards bonus star (2 stars total)
    const streakAnswers: AssessedAnswer[] = Array(4).fill(null).map((_, i) => ({
      questionId: `q${i}`,
      activityId: 'a1',
      correct: true,
      topic: 'colors',
      level: 1,
      timestamp: `${i}`,
    }));
    expect(calculateStarsEarned(true, streakAnswers)).toBe(2);
  });

  it('builds encouraging level-up messages', () => {
    const event12 = buildLevelUpEvent(1, 2);
    expect(event12.fromLevel).toBe(1);
    expect(event12.toLevel).toBe(2);
    expect(event12.message).toContain('Level');

    const event23 = buildLevelUpEvent(2, 3);
    expect(event23.fromLevel).toBe(2);
    expect(event23.toLevel).toBe(3);
  });
});
