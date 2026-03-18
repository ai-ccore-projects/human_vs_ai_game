// src/app/api/room/sync/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getPusherServer } from '@/lib/pusherServer';

/**
 * POST /api/room/sync
 * Receives game state from the kiosk controller and broadcasts it
 * to the TV display via Pusher.
 *
 * Body: { roomCode: string, state: GameSyncPayload }
 */
export async function POST(req: Request) {
  try {
    const { roomCode, state } = await req.json();

    if (!roomCode || typeof roomCode !== 'string') {
      return NextResponse.json({ error: 'Missing roomCode' }, { status: 400 });
    }

    const channelName = `presence-room-${roomCode}`;
    const pusher = getPusherServer();

    await pusher.trigger(channelName, 'game:sync', state);

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    console.error('[ROOM SYNC] Error:', err);
    return NextResponse.json(
      { error: err?.message ?? 'Sync failed' },
      { status: 500 }
    );
  }
}
