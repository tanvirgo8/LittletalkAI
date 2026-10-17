// ============================================================
// LittleTalk AI - LLM-Independent Chat Provider & Fallback Engine
// ============================================================
import type {
  ChatProvider,
  ChatProviderResponse,
  ConversationMode,
  ModeDetectionResult,
} from './types';
import { detectMode } from './mode-detection';
import { generateSELResponse } from './sel-engine';

// ─── Child Safety Guardrails for LLM Output ─────────────────
const BLOCKED_TOPICS = [
  /\b(kill|die|death|blood|gun|weapon|murder|suicide|poison)\b/i,
  /\b(sex|porn|nude|naked|breast|penis|vagina)\b/i,
  /\b(secret|don't tell|promise not to tell|keep this between us)\b/i,
  /\b(what is your address|where do you live|what is your phone|what is your email|what is your full name)\b/i,
  /\b(hate you|stupid|dumb|ugly|idiot)\b/i,
];

/**
 * Validate LLM response content against child safety standards.
 * All model output must be treated as untrusted.
 */
export function validateChildSafety(text: string): { safe: boolean; reason?: string } {
  if (!text || text.trim().length === 0) {
    return { safe: false, reason: 'Empty response' };
  }

  // Response length constraint: keep short for under-7 children
  if (text.length > 280) {
    return { safe: false, reason: 'Response too long for young children' };
  }

  for (const pattern of BLOCKED_TOPICS) {
    if (pattern.test(text)) {
      return { safe: false, reason: 'Violates child safety vocabulary guardrail' };
    }
  }

  return { safe: true };
}

// ─── Deterministic Rule-Based Provider (Default) ───────────
export class DeterministicRuleProvider implements ChatProvider {
  isAvailable(): boolean {
    return true; // Always available 100% offline
  }

  async generateResponse(
    prompt: string,
    context: string,
    _maxTokens: number = 60
  ): Promise<ChatProviderResponse> {
    const startTime = performance.now();

    // Use deterministic mode & SEL engine
    const modeResult = detectMode(prompt);
    const sel = generateSELResponse({
      mode: modeResult.mode,
      attemptCount: 0,
      hasFrustration: false,
      hasSafetyConcern: modeResult.detectedIntent === 'safety',
      isGreeting: /^(hi|hello|hey|good morning|howdy)/i.test(prompt),
      isReturningFromBreak: false,
      childMessage: prompt,
      currentLevel: 1,
    });

    const latencyMs = Math.round(performance.now() - startTime);

    return {
      content: sel.message,
      tokensUsed: 0,
      latencyMs: Math.max(1, latencyMs),
    };
  }

  async classifyIntent(message: string): Promise<ModeDetectionResult> {
    return detectMode(message);
  }
}

// ─── Optional LLM Provider (Behind Feature Flag) ────────────
export class OptionalLLMProvider implements ChatProvider {
  private apiKey: string;
  private endpoint: string;
  private model: string;
  private timeoutMs: number;
  private fallbackProvider: DeterministicRuleProvider;

  constructor(options?: {
    apiKey?: string;
    endpoint?: string;
    model?: string;
    timeoutMs?: number;
  }) {
    this.apiKey = options?.apiKey || process.env.LLM_API_KEY || '';
    this.endpoint =
      options?.endpoint ||
      process.env.LLM_ENDPOINT ||
      'https://api.openai.com/v1/chat/completions';
    this.model = options?.model || process.env.LLM_MODEL || 'gpt-4o-mini';
    this.timeoutMs = options?.timeoutMs || 1500; // 1.5s timeout to guarantee < 2s target
    this.fallbackProvider = new DeterministicRuleProvider();
  }

  isAvailable(): boolean {
    return (
      process.env.ENABLE_LLM === 'true' &&
      Boolean(this.apiKey) &&
      this.apiKey.trim().length > 0 &&
      this.apiKey !== 'demo-key'
    );
  }

  async generateResponse(
    prompt: string,
    context: string,
    maxTokens: number = 60
  ): Promise<ChatProviderResponse> {
    if (!this.isAvailable()) {
      return this.fallbackProvider.generateResponse(prompt, context, maxTokens);
    }

    const startTime = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const systemPrompt = `You are Lumi, a friendly, warm, cheerful learning companion for children aged 3 to 6 learning English.
Rules:
1. Speak in very simple, short sentences (maximum 2 sentences).
2. Use a positive, encouraging tone. Normalize trying and effort.
3. Never use harsh words, sarcasm, or complex vocabulary.
4. Never ask for full names, locations, phone numbers, or passwords.
5. If the child mentions being hurt, advise them to talk to a trusted adult right now.
6. Context: ${context}`;

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`LLM provider HTTP error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim() || '';

      // Validate untrusted model output
      const safety = validateChildSafety(content);
      if (!safety.safe) {
        // Fallback safely if guardrail fails
        return this.fallbackProvider.generateResponse(prompt, context, maxTokens);
      }

      const latencyMs = Math.round(performance.now() - startTime);

      return {
        content,
        tokensUsed: data.usage?.total_tokens || 0,
        latencyMs,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      // Fast deterministic fallback on error or timeout
      const fallback = await this.fallbackProvider.generateResponse(prompt, context, maxTokens);
      return {
        ...fallback,
        latencyMs: Math.round(performance.now() - startTime),
      };
    }
  }

  async classifyIntent(message: string): Promise<ModeDetectionResult> {
    // Intent detection uses deterministic engine first
    return detectMode(message);
  }
}

// ─── Provider Factory ───────────────────────────────────────
let activeProvider: ChatProvider | null = null;

export function getChatProvider(): ChatProvider {
  if (activeProvider) return activeProvider;

  if (process.env.ENABLE_LLM === 'true' && process.env.LLM_API_KEY) {
    activeProvider = new OptionalLLMProvider();
  } else {
    activeProvider = new DeterministicRuleProvider();
  }

  return activeProvider;
}

export function resetChatProviderForTesting(provider?: ChatProvider): void {
  activeProvider = provider || null;
}
