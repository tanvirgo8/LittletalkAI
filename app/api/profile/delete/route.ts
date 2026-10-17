// ============================================================
// LittleTalk AI - Profile Data Purge Route (POST /api/profile/delete)
// Child Safety & Privacy (COPPA-aligned data deletion control)
// ============================================================
import { NextResponse } from 'next/server';
import { ProfileDeleteSchema } from '@/lib/validations';
import { getDatabaseAdapter } from '@/lib/db-adapter';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const parseResult = ProfileDeleteSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid profile delete payload',
          code: 'INVALID_PAYLOAD',
        },
        { status: 400 }
      );
    }

    const { profileId } = parseResult.data;
    const db = getDatabaseAdapter();

    await db.deleteProfileData(profileId);

    return NextResponse.json({
      success: true,
      message: 'All profile and activity data has been permanently deleted.',
      profileId,
      deletedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('Profile Delete Error:', error);
    return NextResponse.json(
      {
        error: 'An internal error occurred during data deletion',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
