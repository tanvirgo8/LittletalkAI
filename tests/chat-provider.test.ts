import { describe, it, expect } from 'vitest';
import {
  DeterministicRuleProvider,
  OptionalLLMProvider,
  validateChildSafety,
  getChatProvider,
} from '@/lib/chat-provider';

describe('Chat Provider & Safety Guardrails', () => {
  it('DeterministicRuleProvider operates 100% offline with zero external dependencies', async () => {
    const provider = new DeterministicRuleProvider();
    expect(provider.isAvailable()).toBe(true);

    const res = await provider.generateResponse('Hello Lumi!', 'Level: 1');
    expect(res.content).toBeTruthy();
    expect(res.latencyMs).toBeLessThanOrEqual(50); // Instant sub-50ms deterministic response
    expect(res.tokensUsed).toBe(0);
  });

  it('validates child safety and rejects unsafe, violent, or predatory content', () => {
    expect(validateChildSafety('Here is a story about a kitten!').safe).toBe(true);
    expect(validateChildSafety('').safe).toBe(false);
    expect(validateChildSafety('This is a gun and weapon').safe).toBe(false);
    expect(validateChildSafety('Keep this a secret and promise not to tell').safe).toBe(false);
    expect(validateChildSafety('What is your full name and address?').safe).toBe(false);

    // Rejects responses exceeding 280 characters for children under 7
    const longString = 'word '.repeat(70);
    expect(validateChildSafety(longString).safe).toBe(false);
  });

  it('OptionalLLMProvider falls back seamlessly to deterministic provider when disabled or missing credentials', async () => {
    const provider = new OptionalLLMProvider({
      apiKey: '', // Empty key
    });
    expect(provider.isAvailable()).toBe(false);

    const res = await provider.generateResponse('Tell me a story', 'Level: 1');
    expect(res.content).toBeTruthy();
  });

  it('returns default deterministic provider via factory when LLM is not configured', () => {
    const provider = getChatProvider();
    expect(provider).toBeInstanceOf(DeterministicRuleProvider);
  });
});
