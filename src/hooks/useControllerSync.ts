// src/hooks/useControllerSync.ts
'use client';

import { useCallback, useRef } from 'react';
import type { GameSyncPayload } from '@/types/room';

/**
 * Used by the kiosk controller page.
 * Broadcasts game state snapshots to the TV via POST /api/room/sync.
 * Throttled to avoid flooding the API (~15 updates/sec max).
 */
export function useControllerSync(roomCode: string | null) {
  const pendingRef = useRef<GameSyncPayload | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentRef = useRef<number>(0);

  const MIN_INTERVAL_MS = 66; // ~15 updates/sec max

  const flush = useCallback(async () => {
    if (!roomCode || !pendingRef.current) return;

    const payload = pendingRef.current;
    pendingRef.current = null;
    lastSentRef.current = Date.now();

    try {
      await fetch('/api/room/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, state: payload }),
      });
    } catch (err) {
      console.error('[ControllerSync] Failed to broadcast state:', err);
    }
  }, [roomCode]);

  /**
   * Call this whenever game state changes.
   * The latest state is kept; if calls come faster than MIN_INTERVAL_MS,
   * only the most recent snapshot is sent.
   */
  const broadcastState = useCallback(
    (state: GameSyncPayload) => {
      if (!roomCode) return;

      pendingRef.current = state;

      const elapsed = Date.now() - lastSentRef.current;
      if (elapsed >= MIN_INTERVAL_MS) {
        // Send immediately
        void flush();
      } else if (!timerRef.current) {
        // Schedule a send after the remaining interval
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          void flush();
        }, MIN_INTERVAL_MS - elapsed);
      }
      // If a timer is already pending, the latest state will be sent when it fires
    },
    [roomCode, flush]
  );

  return { broadcastState };
}
