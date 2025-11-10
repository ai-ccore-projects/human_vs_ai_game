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
  const startTime = Date.now();
  console.log(`[HIGHSCORES API] POST request - ${new Date().toISOString()}`);

  try {
    const json = await req.json();
    const body = ScoreInput.parse(json);
    const fiveSecondsAgo = new Date(Date.now() - 5000);

    console.log(`[HIGHSCORES API] Submitting score - Name: "${body.name}", Score: ${body.score}, Round: ${body.round}, MaxCombo: ${body.maxCombo}`);

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
      const duration = Date.now() - startTime;
      console.log(`[HIGHSCORES API] ⚠️ Duplicate submission detected - Name: "${body.name}" - Duration: ${duration}ms`);
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

    const duration = Date.now() - startTime;
    console.log(`[HIGHSCORES API] ✅ Score saved - Name: "${body.name}", Score: ${body.score} - Duration: ${duration}ms`);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error(`[HIGHSCORES API] ❌ Error saving score - Duration: ${duration}ms - Error:`, err);
    return NextResponse.json({ error: err?.message ?? 'Bad Request' }, { status: 400 });
  }
}

// GET /api/highscores?limit=10 -> pull top scores
export async function GET(req: Request) {
  const startTime = Date.now();
  const url = new URL(req.url);
  const limitRaw = url.searchParams.get('limit');
  const limit = Math.max(1, Math.min(100, Number(limitRaw ?? 10)));

  console.log(`[HIGHSCORES API] GET request - Limit: ${limit} - ${new Date().toISOString()}`);

  try {
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

    const response = {
      items: scores.map((score) => ({
        name: score.name,
        score: score.score,
        round: score.round,
        maxCombo: score.maxCombo,
        createdAt: score.createdAt.getTime(),
      })),
    };

    const duration = Date.now() - startTime;
    console.log(`[HIGHSCORES API] ✅ Retrieved ${scores.length} scores - Duration: ${duration}ms`);

    return NextResponse.json(response);
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error(`[HIGHSCORES API] ❌ Error retrieving scores - Duration: ${duration}ms - Error:`, err);
    return NextResponse.json({ error: err?.message ?? 'Bad Request' }, { status: 400 });
  }
}
