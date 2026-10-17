// ============================================================
// LittleTalk AI - Session Reset Route (POST /api/session/reset)
// Resets conversation & active activity without wiping stars
// ============================================================
import { NextResponse } from 'next/server';
import { SessionResetSchema } from '@/lib/validations';
import { resetSession, getSession } from '@/lib/session-manager';
import { getDatabaseAdapter } from '@/lib/db-adapter';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const parseResult = SessionResetSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid session reset payload',
          code: 'INVALID_PAYLOAD',
        },
        { status: 400 }
      );
    }

    const { sessionId, profileId } = parseResult.data;
    const db = getDatabaseAdapter();

    const updatedSession = resetSession(sessionId);
    if (!updatedSession) {
      return NextResponse.json(
        {
          error: 'Session not found',
          code: 'SESSION_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    await db.saveSession(updatedSession);

    return NextResponse.json({
      success: true,
      message: 'Session state reset successfully. Progress preserved.',
      sessionId: updatedSession.sessionId,
      currentLevel: updatedSession.currentLevel,
      currentMode: updatedSession.currentMode,
    });
  } catch (error: unknown) {
    console.error('Session Reset Error:', error);
    return NextResponse.json(
      {
        error: 'An internal error occurred',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
