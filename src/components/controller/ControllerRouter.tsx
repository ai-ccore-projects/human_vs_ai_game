// src/components/controller/ControllerRouter.tsx
'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useRoom } from '@/hooks/useRoom';
import { useControllerSync } from '@/hooks/useControllerSync';
import { useGameWithLeaderboard } from '@/stores/gameStore';
import { useSound } from '@/hooks/useSoundManager';
import { Volume2, VolumeX } from 'lucide-react';
import ControllerJoinScreen from './ControllerJoinScreen';
import ControllerAttractScreen from './ControllerAttractScreen';
import ControllerNameEntryScreen from './ControllerNameEntryScreen';
import ControllerGameScreen from './ControllerGameScreen';
import ControllerGameOverScreen from './ControllerGameOverScreen';
import type { GameSyncPayload, SyncPair } from '@/types/room';
import { NarratorProvider } from '@/contexts/NarratorContext';

/**
 * Kiosk Controller Router
 * Manages room joining and runs the full game loop,
 * broadcasting state to the TV display via Pusher.
 */
export const ControllerRouter: React.FC = () => {
  const room = useRoom('controller');
  const { broadcastState } = useControllerSync(room.roomCode);
  const store = useGameWithLeaderboard();
  const { soundManager } = useSound();
  const lastBroadcastRef = useRef<string>('');
  
  const [isAudioEnabled, setIsAudioEnabled] = React.useState(true);

  useEffect(() => {
    if (soundManager) {
      setIsAudioEnabled(soundManager.isEnabled());
    }
  }, [soundManager]);

  const handleToggleMute = useCallback(() => {
    if (soundManager) {
      const newState = soundManager.toggleSound();
      setIsAudioEnabled(newState);
      if (newState) {
        soundManager.playMusic('backgroundMusic', 0.1);
      } else {
        soundManager.stopAll();
      }
    }
  }, [soundManager]);

  // Build the sync payload from the current game state
  const buildSyncPayload = useCallback((): GameSyncPayload => {
    const stats = store.getStats();
    const currentPair: SyncPair | null = store.currentPair
      ? {
          images: [
            { url: store.currentPair.images[0]?.url || '', isAI: !!store.currentPair.images[0]?.isAI },
            { url: store.currentPair.images[1]?.url || '', isAI: !!store.currentPair.images[1]?.isAI },
          ],
          aiIndex: (store.currentPair as any).aiIndex ?? 0,
          round: store.round,
          difficulty: 'medium',
        }
      : null;

    return {
      screen: store.screen,
      isPlaying: store.isPlaying,
      isPaused: false,
      gameEnded: store.screen === 'gameOver',
      playerName: store.playerName,
      lives: store.lives,
      score: store.score,
      highScore: store.highScore,
      round: store.round,
      combo: store.combo,
      maxCombo: store.maxCombo,
      timer: store.timer,
      maxTimer: store.maxTimer ?? 10,
      currentPair,
      lastResult: (store as any).lastResult ?? null,
      feedbackMessage: (store as any).feedbackMessage ?? null,
      showResult: (store as any).showResult ?? false,
      showMeta: (store as any).showMeta ?? false,
      metaText: (store as any).metaText ?? null,
      canGoNext: (store as any).canGoNext ?? false,
      narratorCaption: '',
      narratorStatus: '',
      accuracy: stats.accuracy,
      totalCorrectGuesses: stats.totalCorrect,
      totalWrongGuesses: stats.totalWrong,
      leafPath: (store as any).leafPath ?? null,
      leaderboard: store.getLeaderboard().map((e) => ({
        name: e.name,
        score: e.score,
        round: e.round,
        maxCombo: e.maxCombo,
        createdAt: e.date ? Date.parse(e.date) : Date.now(),
      })),
    };
  }, [store]);

  // Broadcast on every meaningful state change
  useEffect(() => {
    if (!room.peerConnected) return;

    const payload = buildSyncPayload();
    const key = JSON.stringify({
      screen: payload.screen,
      score: payload.score,
      lives: payload.lives,
      round: payload.round,
      combo: payload.combo,
      timer: Math.round(payload.timer),
      showResult: payload.showResult,
      playerName: payload.playerName,
      pairUrl0: payload.currentPair?.images[0]?.url,
      pairUrl1: payload.currentPair?.images[1]?.url,
    });

    if (key !== lastBroadcastRef.current) {
      lastBroadcastRef.current = key;
      broadcastState(payload);
    }
  }, [
    room.peerConnected,
    store.screen,
    store.score,
    store.lives,
    store.round,
    store.combo,
    store.timer,
    store.playerName,
    store.isPlaying,
    store.currentImage,
    buildSyncPayload,
    broadcastState,
  ]);

  // Handle room join
  const handleJoin = useCallback(
    (code: string) => {
      room.joinRoom(code);
      if (soundManager) {
        soundManager.unlock();
        soundManager.playMusic('backgroundMusic', 0.1);
      }
    },
    [room, soundManager]
  );

  // Screen transition variants
  const transition: Variants = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, y: -30, transition: { duration: 0.3 } },
  };

  // If not joined a room, show join screen
  if (!room.roomCode || room.connectionStatus === 'disconnected') {
    return <ControllerJoinScreen onJoin={handleJoin} connectionStatus={room.connectionStatus} />;
  }

  // Waiting for TV connection
  if (!room.peerConnected) {
    return (
      <div className="game-container">
        <div className="screen center">
          <div className="text-center">
            <div className="font-arcade text-3xl text-glow-cyan mb-4">ROOM {room.roomCode}</div>
            <motion.div
              className="font-mono text-xl text-glow-green"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              CONNECTING TO TV DISPLAY...
            </motion.div>
            <div className="font-mono text-sm text-white/50 mt-4">
              Make sure the TV is showing this room code
            </div>
          </div>
        </div>
      </div>
    );
  }

  const screen = store.screen;

  return (
    <NarratorProvider>
      <div className="game-container relative">
      {/* Room status bar */}
      <div className="fixed top-0 inset-x-0 z-50 bg-black/80 border-b border-cyan-400/30 px-4 py-2 flex items-center justify-between">
        <div className="font-mono text-sm text-glow-cyan">ROOM: {room.roomCode}</div>
        
        <div className="flex items-center gap-6">
          <button
            onClick={handleToggleMute}
            className="p-1 px-3 bg-gray-800 rounded border border-cyan-400/30 text-cyan-400 hover:bg-gray-700 transition active:scale-95 flex items-center gap-2"
          >
            {isAudioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span className="font-mono text-xs">{isAudioEnabled ? 'MUTE' : 'UNMUTE'}</span>
          </button>

          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${room.peerConnected ? 'bg-green-400' : 'bg-red-500 animate-pulse'}`} />
            <span className="font-mono text-xs text-white/60">
              {room.peerConnected ? 'TV CONNECTED' : 'TV DISCONNECTED'}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            variants={transition}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full h-full"
          >
            {screen === 'attract' && <ControllerAttractScreen />}
            {screen === 'nameEntry' && <ControllerNameEntryScreen />}
            {screen === 'game' && <ControllerGameScreen />}
            {screen === 'gameOver' && <ControllerGameOverScreen />}
          </motion.div>
        </AnimatePresence>
      </div>
      </div>
    </NarratorProvider>
  );
};

export default ControllerRouter;
