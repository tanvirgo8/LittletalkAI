import { describe, it, expect } from 'vitest';
import {
  detectMode,
  validateModeTransition,
  hasSafetyConcern,
  detectFrustration,
  isGreeting,
  extractTopicFromMessage,
} from '@/lib/mode-detection';

describe('Mode Detection Engine', () => {
  it('classifies learning intent deterministically', () => {
    const res1 = detectMode('Teach me animals');
    expect(res1.mode).toBe('LEARNING');

    const res2 = detectMode('I want to learn colors');
    expect(res2.mode).toBe('LEARNING');

    const res3 = detectMode('Next question please');
    expect(res3.mode).toBe('LEARNING');
  });

  it('classifies conversational messages as CONVERSATION', () => {
    const res1 = detectMode('Tell me about your favorite animal');
    expect(res1.mode).toBe('CONVERSATION');

    const res2 = detectMode('What is your name?');
    expect(res2.mode).toBe('CONVERSATION');

    const res3 = detectMode('Tell me a story');
    expect(res3.mode).toBe('CONVERSATION');
  });

  it('classifies play and engagement intent as ENGAGEMENT', () => {
    const res = detectMode("Let's play a game");
    expect(res.mode).toBe('ENGAGEMENT');
  });

  it('classifies frustration and helplessness as SUPPORT', () => {
    const res1 = detectMode("I can't do it");
    expect(res1.mode).toBe('SUPPORT');

    const res2 = detectMode('This is too hard');
    expect(res2.mode).toBe('SUPPORT');

    const res3 = detectMode("I don't know");
    expect(res3.mode).toBe('SUPPORT');
  });

  it('classifies tiredness and rest requests as BREAK', () => {
    const res1 = detectMode('I am tired');
    expect(res1.mode).toBe('BREAK');

    const res2 = detectMode('I want to stop now');
    expect(res2.mode).toBe('BREAK');

    const res3 = detectMode('I need a break');
    expect(res3.mode).toBe('BREAK');
  });

  it('prioritizes safety concerns above all other intents', () => {
    const res = detectMode('someone hurt me');
    expect(res.mode).toBe('SUPPORT');
    expect(res.detectedIntent).toBe('safety');
    expect(hasSafetyConcern('someone hurt me')).toBe(true);
  });

  it('provides safe default mode CONVERSATION when intent is ambiguous', () => {
    const res = detectMode('xyz foo bar');
    expect(res.mode).toBe('CONVERSATION');
    expect(res.method).toBe('default');
  });

  it('validates mode transitions according to child-safety rules', () => {
    // Safety transitions always allowed
    expect(validateModeTransition('LEARNING', 'SUPPORT', "I can't do it")).toBe(true);
    expect(validateModeTransition('LEARNING', 'BREAK', 'I am tired')).toBe(true);

    // From BREAK, child must explicitly signal readiness to return
    expect(validateModeTransition('BREAK', 'LEARNING', "I'm ready now")).toBe(true);
    expect(validateModeTransition('BREAK', 'LEARNING', 'random text')).toBe(false);
  });

  it('detects frustration based on patterns or repeated attempts', () => {
    expect(detectFrustration("I can't do it", 0)).toBe(true);
    expect(detectFrustration('Yellow', 3)).toBe(true);
    expect(detectFrustration('Yellow', 1)).toBe(false);
  });

  it('identifies greetings', () => {
    expect(isGreeting('Hello')).toBe(true);
    expect(isGreeting('Hi!')).toBe(true);
    expect(isGreeting('Teach me colors')).toBe(false);
  });

  it('extracts topic hints from child messages', () => {
    expect(extractTopicFromMessage('I want to learn about colors')).toBe('colors');
    expect(extractTopicFromMessage('Show me animals')).toBe('animals');
    expect(extractTopicFromMessage('Let us count numbers')).toBe('numbers');
    expect(extractTopicFromMessage('Tell me a story')).toBeUndefined();
  });
});
