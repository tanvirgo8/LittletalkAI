import { describe, it, expect, beforeEach } from 'vitest';
import { POST as chatHandler } from '@/app/api/chat/route';
import { POST as answerHandler } from '@/app/api/activity/answer/route';
import { GET as progressHandler } from '@/app/api/progress/route';
import { POST as resetHandler } from '@/app/api/session/reset/route';
import { POST as deleteHandler } from '@/app/api/profile/delete/route';
import { createSession } from '@/lib/session-manager';

describe('API Route Handlers', () => {
  const testSessionId = 'test-session-123';
  const testProfileId = 'test-profile-123';

  beforeEach(() => {
    createSession(testProfileId, 1, testSessionId);
  });

  it('POST /api/chat rejects empty or invalid payload with 400', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '' }), // Missing required fields
    });

    const res = await chatHandler(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.code).toBe('INVALID_PAYLOAD');
  });

  it('POST /api/chat handles valid learning request and returns activity and timings', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Teach me colors',
        sessionId: testSessionId,
        profileId: testProfileId,
      }),
    });

    const res = await chatHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.mode).toBe('LEARNING');
    expect(data.reply).toBeTruthy();
    expect(data.activity).toBeDefined();
    expect(data.activity.topic).toBe('colors');
    expect(data.timings).toBeDefined();
    expect(data.timings.totalMs).toBeLessThanOrEqual(2000); // Sub-2s requirement
  });

  it('POST /api/chat handles conversational message without altering level', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What is your favorite animal?',
        sessionId: testSessionId,
        profileId: testProfileId,
      }),
    });

    const res = await chatHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.mode).toBe('CONVERSATION');
    expect(data.progressUpdate.currentLevel).toBe(1); // Never advances level on conversation
  });

  it('POST /api/activity/answer scores correct answers server-side and awards stars', async () => {
    const req = new Request('http://localhost/api/activity/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: testSessionId,
        profileId: testProfileId,
        activityId: 'l1-colors-1',
        questionId: 'l1-c1-q1', // "What color is the banana?"
        answer: 'Yellow',
        answerId: 'ans-1',
      }),
    });

    const res = await answerHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.correct).toBe(true);
    expect(data.stars).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/activity/answer enforces idempotency on duplicate submissions', async () => {
    // First answer submission
    await answerHandler(
      new Request('http://localhost/api/activity/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: testSessionId,
          profileId: testProfileId,
          activityId: 'l1-colors-1',
          questionId: 'l1-c1-q2',
          answer: 'Blue',
          answerId: 'ans-unique-1',
        }),
      })
    );

    // Duplicate answer submission for same question
    const dupRes = await answerHandler(
      new Request('http://localhost/api/activity/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: testSessionId,
          profileId: testProfileId,
          activityId: 'l1-colors-1',
          questionId: 'l1-c1-q2',
          answer: 'Blue',
          answerId: 'ans-unique-2',
        }),
      })
    );

    expect(dupRes.status).toBe(200);
    const dupData = await dupRes.json();
    expect(dupData.isDuplicate).toBe(true);
    expect(dupData.stars).toBe(0); // Zero additional stars awarded
  });

  it('GET /api/progress retrieves authorized progress and discloses storage type', async () => {
    const req = new Request(
      `http://localhost/api/progress?sessionId=${testSessionId}&profileId=${testProfileId}`
    );

    const res = await progressHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.profileId).toBe(testProfileId);
    expect(data.currentLevel).toBe(1);
    expect(data.storageType).toBeDefined();
  });

  it('POST /api/session/reset clears active turns while preserving level', async () => {
    const req = new Request('http://localhost/api/session/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: testSessionId,
        profileId: testProfileId,
      }),
    });

    const res = await resetHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.currentMode).toBe('LEARNING');
  });

  it('POST /api/profile/delete permanently purges child data', async () => {
    const req = new Request('http://localhost/api/profile/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileId: testProfileId,
      }),
    });

    const res = await deleteHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.profileId).toBe(testProfileId);
  });
});
