// src/app/api/highscores/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

// DB row type
type ScoreRow = {
  id: number;
  name: string;
  score: number;
  round: number;
  max_combo: number;
  created_at: number;
};

// POST /api/highscores  -> submit score
const ScoreInput = z.object({
  name: z.string().min(1).max(32),
  score: z.number().int().min(0),
  round: z.number().int().min(1),
  maxCombo: z.number().int().min(0),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = ScoreInput.parse(json);
    const now = Date.now();

    // Strict-mode/dev safe: dedupe identical submits within 5s
    const recent = db
      .prepare(
        `SELECT COUNT(*) as cnt
         FROM scores
         WHERE name = ?
           AND score = ?
           AND round = ?
           AND max_combo = ?
           AND created_at >= ?`
      )
      .get(body.name, body.score, body.round, body.maxCombo, now - 5000) as { cnt?: number } | undefined;

    if (recent?.cnt && recent.cnt > 0) {
      return NextResponse.json({ ok: true, deduped: true });
    }

    db.prepare(
      `INSERT INTO scores (name, score, round, max_combo, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(body.name, body.score, body.round, body.maxCombo, now);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Bad Request' }, { status: 400 });
  }
}

// GET /api/highscores?limit=10 -> pull top scores
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limitRaw = url.searchParams.get('limit');
    const limit = Math.max(1, Math.min(100, Number(limitRaw ?? 10)));

    const rows = db
      .prepare(
        `SELECT id, name, score, round, max_combo, created_at
         FROM scores
         ORDER BY score DESC, created_at ASC
         LIMIT ?`
      )
      .all(limit) as ScoreRow[];

    return NextResponse.json({
      items: rows.map((r) => ({
        name: r.name,
        score: r.score,
        round: r.round,
        maxCombo: r.max_combo,
        createdAt: r.created_at,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Bad Request' }, { status: 400 });
  }
}
