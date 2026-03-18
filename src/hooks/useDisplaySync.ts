// src/hooks/useDisplaySync.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GameSyncPayload } from '@/types/room';
import { getPusherClient } from '@/lib/pusherClient';

/**
 * Used by the TV display page.
 * Subscribes to `game:sync` events on the Pusher channel and provides
 * the latest game state snapshot for rendering.
 */
export function useDisplaySync(roomCode: string | null) {
  const [syncedState, setSyncedState] = useState<GameSyncPayload | null>(null);

  useEffect(() => {
    if (!roomCode) return;

    const client = getPusherClient();
    if (!client) return;

    const channelName = `presence-room-${roomCode}`;
    // Get existing channel or subscribe if not already
    const channel = client.channel(channelName) || client.subscribe(channelName);

    const handler = (data: GameSyncPayload) => {
      setSyncedState(data);
    };

    channel.bind('game:sync', handler);

    return () => {
      channel.unbind('game:sync', handler);
    };
  }, [roomCode]);

  /** Reset synced state (e.g., on reconnection) */
  const resetSync = useCallback(() => {
    setSyncedState(null);
  }, []);

  return {
    syncedState,
    resetSync,
    hasState: syncedState !== null,
  };
}
