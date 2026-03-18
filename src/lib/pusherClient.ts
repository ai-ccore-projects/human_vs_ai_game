// src/lib/pusherClient.ts
// Client-side Pusher singleton (SSR-safe)

import PusherClient from 'pusher-js';

let _client: PusherClient | null = null;

/**
 * Get a shared Pusher client instance.
 * Returns null during SSR. Safe to call from any component.
 */
export function getPusherClient(): PusherClient | null {
  if (typeof window === 'undefined') return null;
  if (_client) return _client;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!key || !cluster) {
    console.warn('[Pusher] Missing NEXT_PUBLIC_PUSHER_KEY or NEXT_PUBLIC_PUSHER_CLUSTER');
    return null;
  }

  _client = new PusherClient(key, {
    cluster,
    // Auth endpoint for presence channels
    channelAuthorization: {
      endpoint: '/api/room/auth',
      transport: 'ajax',
    },
  });

  return _client;
}

/**
 * Disconnect and clear the singleton (useful for cleanup).
 */
export function disconnectPusher(): void {
  if (_client) {
    _client.disconnect();
    _client = null;
  }
}
