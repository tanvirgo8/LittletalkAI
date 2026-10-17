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
  /want to learn/i,
  /learn/i,
  /practice/i,
  /quiz/i,
  /lesson/i,
  /exercise/i,
  /next (question|activity|lesson)/i,
  /easier (question|one)/i,
  /give me (an? )?(easier|new|next)/i,
  /start (learning|lesson|quiz)/i,
  /test me/i,
  /another question/i,
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
  /puzzle/i,
];

const SUPPORT_PATTERNS: RegExp[] = [
  /can('t|not)/i,
  /don't (know|understand)/i,
  /hard/i,
  /difficult/i,
  /confused/i,
  /help/i,
  /need help/i,
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
  /give me a hint/i,
  /i need some help/i,
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
  /\?/i,
  /^(can|could|do|does|did|will|would|is|are|should|may|have|has)\b/i,
  /^(what|why|how|who|where|when)\b/i,
  /tell me/i,
  /what('s| is) your/i,
  /what (is|are|does|can|do|color)/i,
  /why/i,
  /how (do|does|can|come|are)/i,
  /who (is|are)/i,
  /where (is|are|do)/i,
  /spell/i,
  /sing|rhyme|song/i,
  /do you (like|love|have)/i,
  /can you/i,
  /favorite/i,
  /hello|hi|hey|hiya|howdy/i,
  /how are you/i,
  /good (morning|afternoon|evening|night)/i,
  /story/i,
  /funny/i,
  /joke/i,
  /talk/i,
  /chat/i,
  /friend/i,
  /kemon|bhalo|naam|bondhu|dhonnobad/i,
  /are you/i,
  /thank you|thanks/i,
  /love you/i,
  /my name is/i,
  /years old/i,
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
      confidence: 'high',
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
  const clean = message.trim();
  const isQuestionOrChat =
    /\?|^(what|why|how|who|where|when|can\b|do\b|are\b|is\b|will\b|could\b|tell\b)/i.test(
      clean
    );

  // If the child is asking a question or talking, NEVER hijack it into learning mode!
  if (isQuestionOrChat) {
    return {
      mode: 'CONVERSATION',
      confidence: 'high',
      method: 'contextual',
      detectedIntent: 'child_question',
    };
  }

  // If currently in an activity, only infer learning continuation if it's a short answer attempt
  if (context.currentActivityId && context.currentQuestionId) {
    if (clean.split(/\s+/).length <= 4) {
      return {
        mode: 'LEARNING',
        confidence: 'medium',
        method: 'contextual',
        detectedIntent: 'short_learning_response',
      };
    }
  }

  // If recent mode was LEARNING and no clear break signal
  if (context.currentMode === 'LEARNING') {
    if (clean.split(/\s+/).length <= 3) {
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
    [/number|count|counting|star/i, 'numbers'],
    [/fruit|food/i, 'fruits'],
    [/family|mom|dad|sister|brother/i, 'family'],
    [/word|words|object|thing|things|vocab/i, 'objects'],
    [/phrase/i, 'phrases'],
    [/sentence/i, 'sentences'],
  ];

  for (const [pattern, topic] of topicPatterns) {
    if (pattern.test(message)) return topic;
  }
  return undefined;
}
