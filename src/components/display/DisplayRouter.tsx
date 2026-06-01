// src/components/display/DisplayRouter.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useRoom } from '@/hooks/useRoom';
import { useDisplaySync } from '@/hooks/useDisplaySync';
import DisplayWaitingScreen from './DisplayWaitingScreen';
import DisplayAttractScreen from './DisplayAttractScreen';
import DisplayNameEntryScreen from './DisplayNameEntryScreen';
import DisplayGameScreen from './DisplayGameScreen';
import DisplayGameOverScreen from './DisplayGameOverScreen';

/**
 * TV Display Router
 * Creates a room, shows a code, then renders the game visuals
 * based on state received from the kiosk controller.
 */
export const DisplayRouter: React.FC = () => {
  const room = useRoom('display');
  const { syncedState } = useDisplaySync(room.roomCode);
  const [initialized, setInitialized] = useState(false);

  // Create a room on mount
  useEffect(() => {
    if (initialized) return;
    setInitialized(true);
    (async () => {
      try {
        const code = await room.createRoom();
        room.joinRoom(code);
      } catch (err) {
        // createRoom already retried with backoff; if it still failed, allow the
        // effect to run again so the TV keeps trying instead of dying on boot.
        console.error('[DisplayRouter] Room creation failed; retrying:', err);
        setInitialized(false);
      }
    })();
  }, [initialized, room]);

  // If not connected or no synced state yet, show waiting screen
  const showWaiting = !room.peerConnected || !syncedState;
  const screen = syncedState?.screen ?? 'attract';

  // Screen transition variants
  const getScreenTransition = (screenType: string): Variants => {
    switch (screenType) {
      case 'attract':
        return {
          initial: { opacity: 0, y: 50 },
          animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } },
          exit: { opacity: 0, y: -50, transition: { duration: 0.5, ease: 'easeIn' } },
        };
      case 'nameEntry':
        return {
          initial: { opacity: 0, x: 100 },
          animate: { opacity: 1, x: 0, transition: { duration: 0.7, ease: 'backOut' } },
          exit: { opacity: 0, x: -100, transition: { duration: 0.5, ease: 'easeIn' } },
        };
      case 'game':
        return {
          initial: { opacity: 0, scale: 0.8 },
          animate: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: 'easeOut' } },
          exit: { opacity: 0, scale: 1.1, transition: { duration: 0.4, ease: 'easeIn' } },
        };
      case 'gameOver':
        return {
          initial: { opacity: 0, scale: 1.2, filter: 'blur(10px)' },
          animate: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: 0.8, ease: 'backOut' } },
          exit: { opacity: 0, scale: 0.8, transition: { duration: 0.5, ease: 'easeIn' } },
        };
      default:
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
        };
    }
  };

  return (
    <div className="game-container relative overflow-hidden">
      {/* CRT + digital rain effects */}
      <div className="crt-effect fixed inset-0 pointer-events-none z-50" />
      <div className="digital-rain fixed inset-0 pointer-events-none z-10" />

      <div
        className="relative w-full h-screen"
        style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
      >
        {showWaiting ? (
          <DisplayWaitingScreen
            roomCode={room.roomCode}
            connectionStatus={room.connectionStatus}
          />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              variants={getScreenTransition(screen)}
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute inset-0 w-full h-full"
            >
              {screen === 'attract' && <DisplayAttractScreen state={syncedState!} />}
              {screen === 'nameEntry' && <DisplayNameEntryScreen state={syncedState!} />}
              {screen === 'game' && <DisplayGameScreen state={syncedState!} />}
              {screen === 'gameOver' && <DisplayGameOverScreen state={syncedState!} />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Connection status indicator (bottom-right) */}
      {!showWaiting && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`w-3 h-3 rounded-full ${
              room.peerConnected ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' : 'bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse'
            }`}
            title={room.peerConnected ? 'Controller connected' : 'Controller disconnected'}
          />
        </div>
      )}

      {/* Disconnection overlay */}
      <AnimatePresence>
        {!showWaiting && !room.peerConnected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center"
          >
            <div className="text-center">
              <div className="font-arcade text-4xl text-red-500 mb-4 animate-pulse">
                CONTROLLER DISCONNECTED
              </div>
              <div className="font-mono text-lg text-glow-cyan">
                Waiting for reconnection...
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DisplayRouter;
