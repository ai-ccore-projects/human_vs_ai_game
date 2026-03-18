// src/app/api/room/auth/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getPusherServer } from '@/lib/pusherServer';

/**
 * POST /api/room/auth
 * Pusher channel authorization endpoint for presence channels.
 * Called automatically by the Pusher client SDK when subscribing to `presence-*` channels.
 */
export async function POST(req: Request) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    const socketId = params.get('socket_id');
    const channelName = params.get('channel_name');

    if (!socketId || !channelName) {
      return NextResponse.json(
        { error: 'Missing socket_id or channel_name' },
        { status: 400 }
      );
    }

    // Validate channel name format: presence-room-XXXX
    if (!/^presence-room-\d{4}$/.test(channelName)) {
      return NextResponse.json(
        { error: 'Invalid channel name format' },
        { status: 403 }
      );
    }

    const pusher = getPusherServer();

    // Presence data — identify the client role
    // We use a random user id since we don't have auth; role is passed via custom data
    const presenceData = {
      user_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user_info: { joinedAt: Date.now() },
    };

    const authResponse = pusher.authorizeChannel(socketId, channelName, presenceData);

    return NextResponse.json(authResponse);
  } catch (err: any) {
    console.error('[ROOM AUTH] Error:', err);
    return NextResponse.json(
      { error: err?.message ?? 'Auth failed' },
      { status: 500 }
    );
  }
}
