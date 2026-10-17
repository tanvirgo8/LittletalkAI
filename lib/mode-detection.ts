// ============================================================
// LittleTalk AI - Mode Detection Engine
// Hybrid: deterministic + contextual + optional LLM fallback
// ============================================================
import type {
  ConversationMode,
  ModeDetectionResult,
  ConversationTurn,
  SessionContext,
} from './types';

// ─── Intent Patterns ───────────────────────────────────────

const LEARNING_PATTERNS: RegExp[] = [
  /teach me/i,
  /learn/i,
  /practice/i,
  /quiz/i,
  /lesson/i,
  /what (is|are|does|color)/i,
  /show me/i,
  /how (do|does)/i,
  /can (you|we) (learn|do|try)/i,
  /level/i,
  /words/i,
  /spell/i,
  /sentence/i,
  /next (question|activity|lesson)/i,
  /start (learning|lesson)/i,
  /animals|colors|numbers|fruits|family/i,
];

const ENGAGEMENT_PATTERNS: RegExp[] = [
  /play/i,
  /game/i,
  /fun/i,
  /let('s| us) play/i,
  /games/i,
  /more/i,
  /again/i,
  /another/i,
];

const SUPPORT_PATTERNS: RegExp[] = [
  /can('t|not)/i,
  /don't (know|understand)/i,
  /hard/i,
  /difficult/i,
  /confused/i,
  /help/i,
  /stuck/i,
  /frustrated/i,
  /don't get it/i,
  /too hard/i,
  /give up/i,
  /scared/i,
  /sad/i,
  /angry/i,
  /upset/i,
  /crying/i,
  /mad/i,
  /not (happy|good|okay)/i,
  /feel (bad|sad|angry|mad)/i,
];

const BREAK_PATTERNS: RegExp[] = [
  /tired/i,
  /rest/i,
  /break/i,
  /stop/i,
  /done/i,
  /later/i,
  /sleep/i,
  /sleepy/i,
  /not now/i,
  /enough/i,
  /want to stop/i,
  /come back later/i,
];

const CONVERSATION_PATTERNS: RegExp[] = [
  /tell me (about|a story)/i,
  /what('s| is) your (favorite|name)/i,
  /do you (like|love|have)/i,
  /can you tell/i,
  /favorite/i,
  /hello|hi|hey/i,
  /how are you/i,
  /good (morning|afternoon|evening|night)/i,
  /story/i,
  /funny/i,
  /joke/i,
  /talk/i,
  /chat/i,
  /friend/i,
];

// ─── Safety Patterns ───────────────────────────────────────

const SAFETY_PATTERNS: RegExp[] = [
  /hurt/i,
  /danger/i,
  /emergency/i,
  /abuse/i,
  /hit me/i,
  /hurting me/i,
  /someone hurt/i,
  /unsafe/i,
];

// ─── Detect Mode ───────────────────────────────────────────

/**
 * Primary mode detection using deterministic pattern matching.
 * Returns high confidence when a clear pattern matches.
 */
function detectModeFromPatterns(message: string): ModeDetectionResult | null {
  const lower = message.toLowerCase().trim();

  // SAFETY takes absolute priority
  for (const pattern of SAFETY_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        mode: 'SUPPORT',
        confidence: 'high',
        method: 'deterministic',
        detectedIntent: 'safety',
      };
    }
  }

  // BREAK patterns
  let breakScore = 0;
  for (const pattern of BREAK_PATTERNS) {
    if (pattern.test(lower)) breakScore++;
  }
  if (breakScore >= 1) {
    return {
      mode: 'BREAK',
      confidence: 'high',
      method: 'deterministic',
      detectedIntent: 'rest',
    };
  }

  // SUPPORT patterns
  let supportScore = 0;
  for (const pattern of SUPPORT_PATTERNS) {
    if (pattern.test(lower)) supportScore++;
  }
  if (supportScore >= 1) {
    return {
      mode: 'SUPPORT',
      confidence: supportScore >= 2 ? 'high' : 'medium',
      method: 'deterministic',
      detectedIntent: 'needs_help',
    };
  }

  // LEARNING patterns (strong signals)
  let learningScore = 0;
  for (const pattern of LEARNING_PATTERNS) {
    if (pattern.test(lower)) learningScore++;
  }
  if (learningScore >= 2) {
    return {
      mode: 'LEARNING',
      confidence: 'high',
      method: 'deterministic',
      detectedIntent: 'wants_learning',
    };
  }

  // ENGAGEMENT patterns
  let engagementScore = 0;
  for (const pattern of ENGAGEMENT_PATTERNS) {
    if (pattern.test(lower)) engagementScore++;
  }
  if (engagementScore >= 1 && learningScore === 0) {
    return {
      mode: 'ENGAGEMENT',
      confidence: 'medium',
      method: 'deterministic',
      detectedIntent: 'wants_play',
    };
  }

  // CONVERSATION patterns
  let convScore = 0;
  for (const pattern of CONVERSATION_PATTERNS) {
    if (pattern.test(lower)) convScore++;
  }
  if (convScore >= 1) {
    return {
      mode: 'CONVERSATION',
      confidence: convScore >= 2 ? 'high' : 'medium',
      method: 'deterministic',
      detectedIntent: 'wants_chat',
    };
  }

  // Single learning signal
  if (learningScore === 1) {
    return {
      mode: 'LEARNING',
      confidence: 'medium',
      method: 'deterministic',
      detectedIntent: 'wants_learning',
    };
  }

  return null; // No clear pattern
}

/**
 * Contextual mode detection using recent conversation turns.
 * Considers the current activity and recent mode.
 */
function detectModeFromContext(
  message: string,
  context: Partial<SessionContext>
): ModeDetectionResult | null {
  // If currently in an activity, likely continuing learning
  if (context.currentActivityId && context.currentQuestionId) {
    return {
      mode: 'LEARNING',
      confidence: 'medium',
      method: 'contextual',
      detectedIntent: 'activity_continuation',
    };
  }

  // If recent mode was LEARNING and no clear break signal
  if (context.currentMode === 'LEARNING') {
    // Short messages in learning context are likely answers
    if (message.trim().split(' ').length <= 3) {
      return {
        mode: 'LEARNING',
        confidence: 'low',
        method: 'contextual',
        detectedIntent: 'short_learning_response',
      };
    }
  }

  return null;
}

/**
 * Main mode detection function.
 * Hybrid approach: deterministic → contextual → default.
 * IMPORTANT: Never infer SUPPORT/BREAK modes incorrectly.
 * Safe default is CONVERSATION.
 */
export function detectMode(
  message: string,
  context: Partial<SessionContext> = {}
): ModeDetectionResult {
  const startTime = Date.now();

  // 1. Try deterministic pattern matching (fastest, highest confidence)
  const patternResult = detectModeFromPatterns(message);
  if (patternResult && patternResult.confidence === 'high') {
    return patternResult;
  }

  // 2. Try contextual detection
  const contextResult = detectModeFromContext(message, context);
  if (contextResult && contextResult.confidence === 'medium') {
    // If pattern also gave a result, prefer pattern for medium confidence
    if (patternResult) {
      return patternResult;
    }
    return contextResult;
  }

  // 3. Use pattern result if it has medium confidence
  if (patternResult) {
    return patternResult;
  }

  // 4. Use context result if available
  if (contextResult) {
    return contextResult;
  }

  // 5. Safe default: CONVERSATION
  return {
    mode: 'CONVERSATION',
    confidence: 'low',
    method: 'default',
    detectedIntent: 'unknown',
  };
}

/**
 * Mode transition validation.
 * Some transitions require explicit user intent.
 * Documents the transition rules.
 */
export function validateModeTransition(
  from: ConversationMode,
  to: ConversationMode,
  triggerMessage: string
): boolean {
  // Safety transitions always allowed
  if (to === 'SUPPORT') return true;
  if (to === 'BREAK') return true;

  // From BREAK, only return via explicit request
  if (from === 'BREAK') {
    const returningPatterns = [/ready|back|again|yes|okay|ok|sure|let's|lets/i];
    return returningPatterns.some((p) => p.test(triggerMessage));
  }

  // From SUPPORT, allow gradual transition
  if (from === 'SUPPORT') {
    return to === 'LEARNING' || to === 'ENGAGEMENT' || to === 'CONVERSATION';
  }

  // All other transitions are generally allowed
  return true;
}

/**
 * Check if a message contains safety-critical content.
 * IMPORTANT: Never diagnose. Only flag for gentle escalation.
 */
export function hasSafetyConcern(message: string): boolean {
  return SAFETY_PATTERNS.some((p) => p.test(message));
}

/**
 * Detect if child is expressing frustration (for SEL response).
 */
export function detectFrustration(message: string, attemptCount: number): boolean {
  const frustrationPatterns = [/can't|cannot|don't know|hard|help|frustrated|confused/i];
  const hasPattern = frustrationPatterns.some((p) => p.test(message));
  return hasPattern || attemptCount >= 3;
}

/**
 * Detect if a message is simply a greeting.
 */
export function isGreeting(message: string): boolean {
  return /^(hi|hello|hey|hiya|howdy|good morning|good afternoon|good evening)[\s!.]*$/i.test(
    message.trim()
  );
}

/**
 * Extract topic hints from message.
 */
export function extractTopicFromMessage(message: string): string | undefined {
  const topicPatterns: [RegExp, string][] = [
    [/color|colour/i, 'colors'],
    [/animal/i, 'animals'],
    [/number|count/i, 'numbers'],
    [/fruit/i, 'fruits'],
    [/family/i, 'family'],
    [/object|thing/i, 'objects'],
  ];

  for (const [pattern, topic] of topicPatterns) {
    if (pattern.test(message)) return topic;
  }
  return undefined;
}
