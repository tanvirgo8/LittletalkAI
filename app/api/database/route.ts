// ============================================================
// LittleTalk AI - Database Diagnostics & Live Table API Route
// GET /api/database
// ============================================================
import { NextResponse } from 'next/server';
import { getDatabaseStats, getTableRecords } from '@/lib/sqlite-db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tableName = url.searchParams.get('table');

    const stats = getDatabaseStats();

    if (tableName) {
      const records = getTableRecords(tableName, 50);
      return NextResponse.json({
        tableName,
        recordCount: records.length,
        records,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('API /api/database error:', err);
    const errorMsg = err instanceof Error ? err.message : 'Unknown database error';
    return NextResponse.json(
      {
        error: 'Database query failed',
        details: errorMsg,
        stack: err instanceof Error ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}
