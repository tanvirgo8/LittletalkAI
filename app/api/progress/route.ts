// ============================================================
// LittleTalk AI - Progress API Route Handler (GET /api/progress)
// Parent-facing progress summary without sensitive PII
// ============================================================
import { NextResponse } from 'next/server';
import { getDatabaseAdapter } from '@/lib/db-adapter';
import { getSession, calculateProgressSummary } from '@/lib/session-manager';
import type { ProgressResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const profileId = url.searchParams.get('profileId');
  const sessionId = url.searchParams.get('sessionId');

  if (!profileId && !sessionId) {
    return NextResponse.json(
      {
        error: 'Either profileId or sessionId query parameter is required',
        code: 'MISSING_PARAM',
      },
      { status: 400 }
    );
  }

  const db = getDatabaseAdapter();

  // Try finding session
  let session = sessionId ? getSession(sessionId) : null;
  if (!session && sessionId) {
    session = await db.getSession(sessionId);
  }

  // Calculate progress
  if (session) {
    const summary = calculateProgressSummary(session);
    const payload: ProgressResponse & { storageType: string } = {
      profileId: session.profileId,
      currentLevel: session.currentLevel,
      progressSummary: summary,
      recentTopics: session.recentTopics,
      sessionCount: 1,
      storageType: db.getStorageType(),
    };
    return NextResponse.json(payload);
  }

  // If no session found but profileId supplied, try to get profile
  if (profileId) {
    const profile = await db.getProfile(profileId);
    if (profile) {
      return NextResponse.json({
        profileId: profile.profileId,
        currentLevel: profile.currentLevel,
        progressSummary: profile.progressSummary,
        recentTopics: [],
        sessionCount: 1,
        storageType: db.getStorageType(),
      });
    }
  }

  return NextResponse.json(
    {
      error: 'Profile or session not found',
      code: 'NOT_FOUND',
    },
    { status: 404 }
  );
}
