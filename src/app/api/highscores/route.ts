// src/app/api/highscores/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

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
    const fiveSecondsAgo = new Date(Date.now() - 5000);

    // Strict-mode/dev safe: dedupe identical submits within 5s
    const recentCount = await prisma.score.count({
      where: {
        name: body.name,
        score: body.score,
        round: body.round,
        maxCombo: body.maxCombo,
        createdAt: {
          gte: fiveSecondsAgo
        }
      }
    });

    if (recentCount > 0) {
      return NextResponse.json({ ok: true, deduped: true });
    }

    await prisma.score.create({
      data: {
        name: body.name,
        score: body.score,
        round: body.round,
        maxCombo: body.maxCombo,
      }
    });

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

    const scores = await prisma.score.findMany({
      select: {
        name: true,
        score: true,
        round: true,
        maxCombo: true,
        createdAt: true,
      },
      orderBy: [
        { score: 'desc' },
        { createdAt: 'asc' }
      ],
      take: limit
    });

    return NextResponse.json({
      items: scores.map((score) => ({
        name: score.name,
        score: score.score,
        round: score.round,
        maxCombo: score.maxCombo,
        createdAt: score.createdAt.getTime(),
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Bad Request' }, { status: 400 });
  }
}
