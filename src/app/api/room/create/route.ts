// src/app/api/room/create/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

/**
 * POST /api/room/create
 * Generates a random 4-digit room code.
 * No server-side storage — the code is just a Pusher channel name convention.
 */
export async function POST() {
  const code = String(Math.floor(1000 + Math.random() * 9000)); // 1000–9999
  console.log(`[ROOM API] Created room: ${code}`);
  return NextResponse.json({ code }, { headers: { 'Cache-Control': 'no-store' } });
}
