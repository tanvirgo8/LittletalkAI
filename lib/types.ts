// ============================================================
// LittleTalk AI - Core Type Definitions
// ============================================================

// ─── Learning Levels ───────────────────────────────────────
export type LearningLevel = 1 | 2 | 3;

// ─── Conversation Modes ────────────────────────────────────
export type ConversationMode =
  | 'LEARNING'
  | 'CONVERSATION'
  | 'ENGAGEMENT'
  | 'SUPPORT'
  | 'BREAK';

// ─── Topics ────────────────────────────────────────────────
export type LearningTopic =
  | 'colors'
  | 'animals'
  | 'numbers'
  | 'fruits'
  | 'family'
  | 'objects'
  | 'phrases'
  | 'sentences'
  | 'conversation';

// ─── Activity Types ────────────────────────────────────────
export type ActivityType =
  | 'multiple_choice'
  | 'fill_in'
  | 'listen_and_select'
  | 'sentence_build'
  | 'conversation_prompt';

export type ActivityStatus = 'pending' | 'active' | 'completed' | 'review';

// ─── Activity Question ─────────────────────────────────────
export interface ActivityQuestion {
  id: string;
  text: string;
  imageHint?: string; // emoji or description for illustration
  options?: string[];
  correctAnswer: string;
  hint?: string;
}

// ─── Activity ──────────────────────────────────────────────
export interface Activity {
  id: string;
  type: ActivityType;
  topic: LearningTopic;
  level: LearningLevel;
  questions: ActivityQuestion[];
  title: string;
}

// ─── Progress Summary ──────────────────────────────────────
export interface ProgressSummary {
  totalAnswered: number;
  totalCorrect: number;
  streakCount: number;
  topicProgress: Partial<Record<LearningTopic, TopicProgress>>;
  level1Mastered: boolean;
  level2Mastered: boolean;
  starsEarned: number;
}

export interface TopicProgress {
  topic: LearningTopic;
  attempts: number;
  correct: number;
  lastAttemptAt: string;
}

// ─── Child Profile ─────────────────────────────────────────
export interface ChildProfile {
  profileId: string;
  nickname?: string; // optional, not required
  currentLevel: LearningLevel;
  preferences: {
    favoriteColor?: string;
    favoriteTopic?: LearningTopic;
  };
  progressSummary: ProgressSummary;
  createdAt: string;
  updatedAt: string;
}

// ─── Session Context ───────────────────────────────────────
export interface SessionContext {
  sessionId: string;
  profileId: string;
  currentMode: ConversationMode;
  currentTopic?: LearningTopic;
  currentLevel: LearningLevel;
  currentActivityId?: string;
  currentQuestionId?: string;
  attemptCount: number;
  correctAnswerCount: number;
  recentTurns: ConversationTurn[];
  completedActivities: string[];
  recentTopics: LearningTopic[];
  lastInteractionAt: string;
  // Recent assessed answers for mastery calculation (bounded to 10)
  recentAssessedAnswers: AssessedAnswer[];
  // Track answered question IDs to prevent duplicate submissions
  answeredQuestionIds: string[];
}

export interface ConversationTurn {
  role: 'child' | 'bot';
  content: string;
  timestamp: string;
  mode?: ConversationMode;
}

export interface AssessedAnswer {
  questionId: string;
  activityId: string;
  correct: boolean;
  topic: LearningTopic;
  level: LearningLevel;
  timestamp: string;
}

// ─── Chat Request / Response ───────────────────────────────
export interface ChatRequest {
  message: string;
  sessionId: string;
  profileId: string;
  selectedOption?: string; // for multiple-choice quick replies
  answerId?: string; // idempotency key for answers
}

export interface ChatResponse {
  reply: string;
  mode: ConversationMode;
  quickReplies?: QuickReply[];
  activity?: ActivityDisplay;
  progressUpdate?: ProgressUpdate;
  levelUp?: LevelUpEvent;
  stars?: number; // stars earned this interaction
  suggestedBreak?: boolean;
  timings: ResponseTimings;
}

export interface QuickReply {
  id: string;
  label: string;
  value: string;
  isCorrect?: boolean; // only revealed after answer
  emoji?: string;
}

export interface ActivityDisplay {
  activityId: string;
  questionId: string;
  question: string;
  imageHint?: string;
  options: QuickReply[];
  topic: LearningTopic;
  level: LearningLevel;
  hint?: string;
}

export interface ProgressUpdate {
  currentLevel: LearningLevel;
  starsEarned: number;
  totalStars: number;
  masteryPercent: number;
  topicLabel: string;
}

export interface LevelUpEvent {
  fromLevel: LearningLevel;
  toLevel: LearningLevel;
  message: string;
}

export interface ResponseTimings {
  totalMs: number;
  modeDetectionMs: number;
  learningEngineMs: number;
  dbMs: number;
  llmMs?: number;
}

// ─── Answer Submission ─────────────────────────────────────
export interface AnswerRequest {
  sessionId: string;
  profileId: string;
  activityId: string;
  questionId: string;
  answer: string;
  answerId: string; // idempotency key
}

export interface AnswerResponse {
  correct: boolean;
  correctAnswer: string;
  feedback: string;
  stars?: number;
  masteryUpdate?: MasteryUpdate;
  levelUp?: LevelUpEvent;
}

export interface MasteryUpdate {
  currentLevel: LearningLevel;
  masteryPercent: number;
  answeredCount: number;
  requiredCount: number;
}

// ─── Progress API ──────────────────────────────────────────
export interface ProgressResponse {
  profileId: string;
  currentLevel: LearningLevel;
  progressSummary: ProgressSummary;
  recentTopics: LearningTopic[];
  sessionCount: number;
}

// ─── Mode Detection ────────────────────────────────────────
export interface ModeDetectionResult {
  mode: ConversationMode;
  confidence: 'high' | 'medium' | 'low';
  method: 'deterministic' | 'contextual' | 'llm' | 'default';
  detectedIntent?: string;
}

// ─── LLM Provider Interface ────────────────────────────────
export interface ChatProviderResponse {
  content: string;
  tokensUsed?: number;
  latencyMs: number;
}

export interface ChatProvider {
  generateResponse(
    prompt: string,
    context: string,
    maxTokens?: number
  ): Promise<ChatProviderResponse>;
  classifyIntent?(message: string): Promise<ModeDetectionResult>;
  isAvailable(): boolean;
}

// ─── API Error ─────────────────────────────────────────────
export interface ApiError {
  error: string;
  code: string;
  correlationId: string;
  timestamp: string;
}

// ─── Mastery Config ────────────────────────────────────────
export interface MasteryConfig {
  threshold: number; // 0-1, default 0.8
  minAssessedAnswers: number; // default 10
  minCorrectStreak?: number; // optional streak requirement
  reviewTriggerThreshold: number; // trigger review if below this, default 0.5
  reviewQuestionCount: number; // how many review questions before re-assess
}

export const DEFAULT_MASTERY_CONFIG: MasteryConfig = {
  threshold: 0.8,
  minAssessedAnswers: 10,
  reviewTriggerThreshold: 0.5,
  reviewQuestionCount: 3,
};
