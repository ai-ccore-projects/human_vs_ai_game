// src/hooks/useRoom.ts
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { getPusherClient, disconnectPusher } from '@/lib/pusherClient';
import type { RoomRole, RoomConnectionStatus } from '@/types/room';
import type { Channel, PresenceChannel } from 'pusher-js';

export function useRoom(role: RoomRole) {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<RoomConnectionStatus>('disconnected');
  const [peerConnected, setPeerConnected] = useState(false);
  const channelRef = useRef<PresenceChannel | null>(null);

  /**
   * Create a new room (display/TV side).
   * Returns the generated 4-digit code.
   */
  const createRoom = useCallback(async (): Promise<string> => {
    // Retry with backoff — a transient failure here (e.g. the server briefly
    // restarting) would otherwise leave the TV stuck on the waiting screen with
    // no room code, requiring a manual reload at the exhibit.
    let lastErr: unknown;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const res = await fetch('/api/room/create', { method: 'POST' });
        if (!res.ok) throw new Error(`room/create HTTP ${res.status}`);
        const { code } = await res.json();
        if (!code) throw new Error('room/create returned no code');
        setRoomCode(code);
        return code;
      } catch (err) {
        lastErr = err;
        console.error(`[useRoom] createRoom attempt ${attempt + 1} failed:`, err);
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('Failed to create room');
  }, []);

  /**
   * Subscribe to a room channel.
   * Both display and controller call this after they have a room code.
   */
  const joinRoom = useCallback(
    (code: string) => {
      const client = getPusherClient();
      if (!client) {
        setConnectionStatus('error');
        return;
      }

      setRoomCode(code);
      setConnectionStatus('connecting');

      const channelName = `presence-room-${code}`;

      // Disconnect from any previous channel
      if (channelRef.current) {
        client.unsubscribe(channelRef.current.name);
        channelRef.current = null;
      }

      const channel = client.subscribe(channelName) as PresenceChannel;
      channelRef.current = channel;

      channel.bind('pusher:subscription_succeeded', () => {
        setConnectionStatus('connected');
        // Check if the peer is already here
        const memberCount = channel.members.count;
        setPeerConnected(memberCount > 1);
      });

      channel.bind('pusher:member_added', () => {
        setPeerConnected(true);
      });

      channel.bind('pusher:member_removed', () => {
        const memberCount = channel.members?.count ?? 0;
        setPeerConnected(memberCount > 1);
      });

      channel.bind('pusher:subscription_error', () => {
        setConnectionStatus('error');
      });
    },
    []
  );

  /**
   * Leave the room and disconnect.
   */
  const leaveRoom = useCallback(() => {
    const client = getPusherClient();
    if (client && channelRef.current) {
      client.unsubscribe(channelRef.current.name);
      channelRef.current = null;
    }
    setRoomCode(null);
    setConnectionStatus('disconnected');
    setPeerConnected(false);
  }, []);

  /**
   * Get the current Pusher channel (for binding custom events).
   */
  const getChannel = useCallback((): Channel | null => {
    return channelRef.current;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        const client = getPusherClient();
        if (client) client.unsubscribe(channelRef.current.name);
        channelRef.current = null;
      }
    };
  }, []);

  return {
    roomCode,
    connectionStatus,
    peerConnected,
    role,
    createRoom,
    joinRoom,
    leaveRoom,
    getChannel,
  };
}
