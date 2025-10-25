export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

// shape returned to client
type OutItem = { id: number; url: string; isAI: boolean };

const QuerySchema = z.object({
  session: z.coerce.number().int().positive(),
  kind: z.enum(['ai', 'human']),
  count: z.coerce.number().int().min(1).max(100).default(10),
});

/**
 * GET /api/images/batch?session=123&kind=ai|human&count=10
 *
 * - Pulls up to {count} active, unseen images of the requested kind for this session
 * - Marks them as seen IN THE SAME TRANSACTION (reservation) to guarantee uniqueness
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parse = QuerySchema.safeParse({
      session: url.searchParams.get('session'),
      kind: url.searchParams.get('kind'),
      count: url.searchParams.get('count'),
    });
    if (!parse.success) {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
    }
    const { session, kind, count } = parse.data;
    const wantAI = kind === 'ai' ? 1 : 0;

    // Use a transaction: pick unseen rows, then mark them as seen for this session
    const trx = db.transaction((sess: number, is_ai: number, limit: number) => {
      const rows = db
        .prepare(
          `
          SELECT id, url, is_ai
          FROM images
          WHERE active = 1
            AND is_ai = ?
            AND id NOT IN (
              SELECT image_id FROM image_session_seen WHERE session_id = ?
            )
          ORDER BY RANDOM()
          LIMIT ?
        `
        )
        .all(is_ai, sess, limit) as { id: number; url: string; is_ai: number }[];

      const seenStmt = db.prepare(`
        INSERT OR IGNORE INTO image_session_seen (session_id, image_id, seen_at)
        VALUES (?, ?, ?)
      `);

      const now = Date.now();
      for (const r of rows) {
        seenStmt.run(sess, r.id, now);
      }

      const out: OutItem[] = rows.map((r) => ({ id: r.id, url: r.url, isAI: r.is_ai === 1 }));
      return out;
    });

    const items = trx(session, wantAI, count);
    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Bad Request' }, { status: 400 });
  }
}
