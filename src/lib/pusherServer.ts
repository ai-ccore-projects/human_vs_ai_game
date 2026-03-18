// src/lib/pusherServer.ts
// Server-side Pusher instance for API routes (triggers events to clients)

import Pusher from 'pusher';

let _pusher: Pusher | null = null;

export function getPusherServer(): Pusher {
  if (_pusher) return _pusher;

  const appId = process.env.PUSHER_APP_ID;
  const secret = process.env.PUSHER_SECRET;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!appId || !secret || !key || !cluster) {
    throw new Error(
      'Missing Pusher env vars. Set PUSHER_APP_ID, PUSHER_SECRET, NEXT_PUBLIC_PUSHER_KEY, NEXT_PUBLIC_PUSHER_CLUSTER.'
    );
  }

  _pusher = new Pusher({ appId, key, secret, cluster, useTLS: true });
  return _pusher;
}
