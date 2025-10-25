// src/app/api/images/next/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

type ImageRow = { id: number; url: string | null; is_ai: number; active: number };

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const session = z.coerce.number().int().positive().parse(url.searchParams.get('session'));

    // Pick a random image not yet seen in this session
    const stmt = db.prepare(`
      SELECT id, url, is_ai, active
      FROM images
      WHERE active = 1
        AND url IS NOT NULL                -- ✅ make sure URL exists
        AND TRIM(url) <> ''                -- ✅ skip empty strings
        AND id NOT IN (
          SELECT image_id FROM image_session_seen WHERE session_id = ?
        )
      ORDER BY RANDOM()
      LIMIT 1
    `);

    const row = stmt.get(session) as ImageRow | undefined;

    if (!row) {
      return NextResponse.json({ done: true }, { status: 200 });
    }

    if (!row.url) {
      // ✅ Defensive guard: should not happen due to WHERE, but just in case
      return NextResponse.json(
        { error: `Image ${row.id} has no URL in DB` },
        { status: 400 }
      );
    }

    // Mark as seen for this session
    db.prepare(`
      INSERT OR IGNORE INTO image_session_seen (session_id, image_id, seen_at)
      VALUES (?, ?, ?)
    `).run(session, row.id, Date.now());

    return NextResponse.json({
      id: row.id,
      url: row.url,
      isAI: row.is_ai === 1,
    });
  } catch (err: any) {
    console.error("❌ API /api/images/next error:", err);
    return NextResponse.json(
      { error: err?.message ?? 'Bad Request' },
      { status: 400 }
    );
  }
}
