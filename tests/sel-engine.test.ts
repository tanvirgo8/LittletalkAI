import { describe, it, expect } from 'vitest';
import {
  generateSELResponse,
  generateHintMessage,
  generatePersistenceMessage,
  generateTopicIntro,
} from '@/lib/sel-engine';

describe('Social & Emotional Learning (SEL) Engine', () => {
  it('directs children to a trusted adult when safety concerns arise without promising secrecy', () => {
    const res = generateSELResponse({
      mode: 'SUPPORT',
      attemptCount: 0,
      hasFrustration: false,
      hasSafetyConcern: true,
      isGreeting: false,
      isReturningFromBreak: false,
      childMessage: 'I am hurt and scared',
      currentLevel: 1,
    });

    expect(res.requiresTrustedAdult).toBe(true);
    expect(res.type).toBe('safety');
    expect(res.message).toContain('grown-up');
    expect(res.message).not.toContain('keep this between us');
    expect(res.message).not.toContain('secret');
  });

  it('normalizes mistakes on incorrect answers with gentle encouragement', () => {
    const res = generateSELResponse({
      mode: 'LEARNING',
      attemptCount: 1,
      isCorrect: false,
      hasFrustration: false,
      hasSafetyConcern: false,
      isGreeting: false,
      isReturningFromBreak: false,
      childMessage: 'Blue',
      currentLevel: 1,
    });

    expect(res.type).toBe('incorrect');
    expect(res.message.length).toBeGreaterThan(5);
    // Praises trying, does not shame
    expect(res.message).not.toContain('wrong');
    expect(res.message).not.toContain('bad');
  });

  it('praises effort and persistence for correct answers', () => {
    const res = generateSELResponse({
      mode: 'LEARNING',
      attemptCount: 1,
      isCorrect: true,
      hasFrustration: false,
      hasSafetyConcern: false,
      isGreeting: false,
      isReturningFromBreak: false,
      childMessage: 'Yellow',
      currentLevel: 1,
    });

    expect(res.type).toBe('correct');
    expect(res.message.length).toBeGreaterThan(5);
  });

  it('offers a simpler activity or break when child is frustrated', () => {
    const res = generateSELResponse({
      mode: 'SUPPORT',
      attemptCount: 2,
      hasFrustration: true,
      hasSafetyConcern: false,
      isGreeting: false,
      isReturningFromBreak: false,
      childMessage: "This is too hard, I can't do it",
      currentLevel: 1,
    });

    expect(res.suggestEasier).toBe(true);
    expect(res.type).toBe('frustration');
  });

  it('validates break responses and suggests resting', () => {
    const res = generateSELResponse({
      mode: 'BREAK',
      attemptCount: 0,
      hasFrustration: false,
      hasSafetyConcern: false,
      isGreeting: false,
      isReturningFromBreak: false,
      childMessage: 'I am sleepy',
      currentLevel: 1,
    });

    expect(res.suggestBreak).toBe(true);
    expect(res.type).toBe('break');
  });

  it('welcomes children back when returning from a break', () => {
    const res = generateSELResponse({
      mode: 'LEARNING',
      attemptCount: 0,
      hasFrustration: false,
      hasSafetyConcern: false,
      isGreeting: false,
      isReturningFromBreak: true,
      childMessage: "I'm ready now!",
      currentLevel: 1,
    });

    expect(res.type).toBe('break_return');
  });

  it('generates friendly topic introductions and hints', () => {
    const intro = generateTopicIntro('colors', 1);
    expect(intro).toContain('COLORS');

    const hint = generateHintMessage('Bananas are yellow!');
    expect(hint).toContain('Bananas are yellow!');
  });
});
