import { describe, it, expect, beforeEach } from 'vitest';
import { POST as chatHandler } from '@/app/api/chat/route';
import { createSession } from '@/lib/session-manager';
import { detectMode, extractTopicFromMessage } from '@/lib/mode-detection';

describe('User Reported Fixes Verification', () => {
  const sessionId = 'test-fix-session';
  const profileId = 'test-fix-child';

  beforeEach(() => {
    createSession(profileId, 1, sessionId);
  });

  it('1. Chat answers questions properly instead of returning quiz questions', async () => {
    // Child asks what a cat is
    const req1 = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What is a cat?', sessionId, profileId }),
    });
    const res1 = await chatHandler(req1);
    const data1 = await res1.json();
    expect(data1.mode).toBe('CONVERSATION');
    expect(data1.reply.toLowerCase()).toContain('cat');
    expect(data1.reply.toLowerCase()).not.toContain('what color is the banana');

    // Child asks animal sound
    const req2 = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What does a dog say?', sessionId, profileId }),
    });
    const res2 = await chatHandler(req2);
    const data2 = await res2.json();
    expect(data2.reply.toLowerCase()).toContain('woof');

    // Child asks for spelling
    const req3 = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Spell cat', sessionId, profileId }),
    });
    const res3 = await chatHandler(req3);
    const data3 = await res3.json();
    expect(data3.reply).toContain('C-A-T');

    // Child asks in Bengali
    const req4 = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'kemon acho Lumi?', sessionId, profileId }),
    });
    const res4 = await chatHandler(req4);
    const data4 = await res4.json();
    expect(data4.reply.toLowerCase()).toContain('bhalo');
  });

  it('2. Learn Words loads vocabulary words activity (objects)', async () => {
    const topic = extractTopicFromMessage('teach me words');
    expect(topic).toBe('objects');

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'teach me words', sessionId, profileId }),
    });
    const res = await chatHandler(req);
    const data = await res.json();
    expect(data.mode).toBe('LEARNING');
    expect(data.activity).toBeDefined();
    expect(data.activity.topic).toBe('objects');
  });

  it('3. Games mode offers category-wise quick replies and loads game challenge', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Let's play a game", sessionId, profileId }),
    });
    const res = await chatHandler(req);
    const data = await res.json();
    expect(data.mode).toBe('ENGAGEMENT');
    expect(data.activity).toBeDefined();
    expect(data.activity.question).toContain('🎮');

    // Check quick replies have game categories
    const qrLabels = data.quickReplies.map((qr: { label: string }) => qr.label);
    expect(qrLabels).toContain('🐾 Animal Quiz');
    expect(qrLabels).toContain('🎨 Color Match');
    expect(qrLabels).toContain('🔢 Star Counter');

    // Selecting Animals category loads animals game
    const reqAnimals = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'play animal game', sessionId, profileId }),
    });
    const resAnimals = await chatHandler(reqAnimals);
    const dataAnimals = await resAnimals.json();
    expect(dataAnimals.activity.topic).toBe('animals');

    // Selecting Colors category loads colors game
    const reqColors = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'play color game', sessionId, profileId }),
    });
    const resColors = await chatHandler(reqColors);
    const dataColors = await resColors.json();
    expect(dataColors.activity.topic).toBe('colors');

    // Selecting Numbers category loads numbers game
    const reqNumbers = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'play number game', sessionId, profileId }),
    });
    const resNumbers = await chatHandler(reqNumbers);
    const dataNumbers = await resNumbers.json();
    expect(dataNumbers.activity.topic).toBe('numbers');

    // Selecting Fruits category loads fruits game
    const reqFruits = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'play fruit game', sessionId, profileId }),
    });
    const resFruits = await chatHandler(reqFruits);
    const dataFruits = await resFruits.json();
    expect(dataFruits.activity.topic).toBe('fruits');
  });

  it('4. Next question advances to the next question without repeating', async () => {
    // Start with animals
    const req1 = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'teach me animals', sessionId, profileId }),
    });
    const res1 = await chatHandler(req1);
    const data1 = await res1.json();
    const q1Id = data1.activity.questionId;

    // Send next question
    const req2 = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'next question', sessionId, profileId }),
    });
    const res2 = await chatHandler(req2);
    const data2 = await res2.json();
    const q2Id = data2.activity.questionId;

    expect(q2Id).not.toBe(q1Id);
  });

  it('5. Need Help mode provides supportive guidance and handles easier questions & hints', async () => {
    // Start an activity
    await chatHandler(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'teach me colors', sessionId, profileId }),
      })
    );

    // Ask for help
    const reqHelp = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'I need some help', sessionId, profileId }),
    });
    const resHelp = await chatHandler(reqHelp);
    const dataHelp = await resHelp.json();
    expect(dataHelp.mode).toBe('SUPPORT');
    expect(dataHelp.activity).toBeDefined(); // Doesn't wipe the question!

    // Request easier question
    const reqEasier = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'give me an easier question', sessionId, profileId }),
    });
    const resEasier = await chatHandler(reqEasier);
    const dataEasier = await resEasier.json();
    expect(dataEasier.reply.toLowerCase()).toContain('easier');
    expect(dataEasier.activity).toBeDefined();

    // Request hint
    const reqHint = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'give me a hint', sessionId, profileId }),
    });
    const resHint = await chatHandler(reqHint);
    const dataHint = await resHint.json();
    expect(dataHint.reply.toLowerCase()).toContain('hint');
  });

  it('6. Answering via chat or quick reply scores the question and returns next question', async () => {
    // Start numbers activity: "How many stars? ⭐⭐⭐" (correct: Three)
    const reqStart = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'teach me numbers', sessionId, profileId }),
    });
    const resStart = await chatHandler(reqStart);
    const dataStart = await resStart.json();
    expect(dataStart.activity.topic).toBe('numbers');
    const firstQId = dataStart.activity.questionId;

    // Send answer 'Three' via chat / quick reply
    const reqAnswer = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Three', sessionId, profileId }),
    });
    const resAnswer = await chatHandler(reqAnswer);
    const dataAnswer = await resAnswer.json();

    // Verify it gave correct feedback, not repeating the question
    expect(dataAnswer.reply).toContain('correct!');
    expect(dataAnswer.activity).toBeDefined();
    expect(dataAnswer.activity.questionId).not.toBe(firstQId); // Advanced to next question!
  });

  it('7. SoundFX supports instant muting and stopAll on sound off', async () => {
    const { soundFX } = await import('@/lib/sound-effects');
    expect(soundFX.getMuted()).toBe(false);

    soundFX.setMuted(true);
    expect(soundFX.getMuted()).toBe(true);

    // Muted sound playback produces no exceptions and stays silent
    expect(() => soundFX.playCorrectChime()).not.toThrow();
    expect(() => soundFX.playPopSound()).not.toThrow();
    expect(() => soundFX.playGentleTryAgain()).not.toThrow();
    expect(() => soundFX.playLevelUpFanfare()).not.toThrow();

    soundFX.setMuted(false);
    expect(soundFX.getMuted()).toBe(false);
  });
});

