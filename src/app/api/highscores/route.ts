// src/app/api/highscores/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const ScoreInput = z.object({
  gameId: z.string().uuid(),
  name: z.string().min(1).max(32),
  score: z.number().int().min(0),
  round: z.number().int().min(1),
  maxCombo: z.number().int().min(0),
});

// ── POST /api/highscores → submit score ────────────────────────────
export async function POST(req: Request) {
  const started = Date.now();
  console.log(`[HIGHSCORES API] POST request - ${new Date().toISOString()}`);

  try {
    const body = ScoreInput.parse(await req.json());

    // ✅ Replace your old `upsert` block with this
    try {
      await prisma.score.create({
        data: {
          gameId: body.gameId,
          name: body.name,
          score: body.score,
          round: body.round,
          maxCombo: body.maxCombo,
        },
      });
      console.log(
        `[HIGHSCORES API] ✅ Score saved - gameId: ${body.gameId} - Duration: ${
          Date.now() - started
        }ms`
      );
    } catch (e: any) {
      if (e.code === 'P2002' && e.meta?.target?.includes('gameId')) {
        console.log(
          `[HIGHSCORES API] ⚠️ Duplicate gameId ${body.gameId} (React Strict Mode double submit) — ignoring`
        );
      } else {
        throw e;
      }
    }

    return NextResponse.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: any) {
    console.error('[HIGHSCORES API] ❌ POST error:', err);
    return NextResponse.json(
      { error: err?.message ?? 'Bad Request' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

// ── GET /api/highscores?limit=10 → pull top scores ────────────────────────────
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') ?? 10)));

  try {
    // get more than we need, then collapse by gameId
    const rows = await prisma.score.findMany({
      select: { gameId: true, name: true, score: true, round: true, maxCombo: true, createdAt: true },
      orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
      take: Math.max(limit * 3, 50),
    });

    // keep the first row we see for each gameId
    const seen = new Set<string>();
    const deduped: typeof rows = [];
    for (const r of rows) {
      if (seen.has(r.gameId)) continue;
      seen.add(r.gameId);
      deduped.push(r);
      if (deduped.length >= limit) break;
    }

    return NextResponse.json({
      items: deduped.map(s => ({
        name: s.name,
        score: s.score,
        round: s.round,
        maxCombo: s.maxCombo,
        createdAt: s.createdAt.getTime(),
      })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Bad Request' }, { status: 400 });
  }
}
