'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameWithLeaderboard } from '@/stores/gameStore';
import { useSound } from '@/hooks/useSoundManager';
import AttractModeScreen from './screens/AttractModeScreen';
import NameEntryScreen from './screens/NameEntryScreen';
import GameScreen from './screens/GameScreen';
import GameOverScreen from './screens/GameOverScreen';

/**
 * Main Game Router - Manages screen transitions and animations
 * Provides smooth transitions between all game screens
 */
export const GameRouter: React.FC = () => {
  const { screen } = useGameWithLeaderboard();
  const { soundManager, isSoundInitialized } = useSound();

  // Effect to play music based on the current screen
  useEffect(() => {
    if (!soundManager || !isSoundInitialized) return;

    switch (screen) {
      case 'attract':
      case 'game':
      case 'gameOver':
        soundManager.playMusic('backgroundMusic');
        break;
      default:
        soundManager.stopMusic();
        break;
    }
  }, [screen, soundManager, isSoundInitialized]);

  // Screen transition variants
  const screenVariants = {
    initial: { 
      opacity: 0, 
      scale: 0.95,
      rotateX: -10 
    },
    animate: { 
      opacity: 1, 
      scale: 1,
      rotateX: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0, 
      scale: 1.05,
      rotateX: 10,
      transition: {
        duration: 0.4,
        ease: "easeIn"
      }
    }
  };

  // Specialized transitions for different screen types
  const getScreenTransition = (screenType: string) => {
    switch (screenType) {
      case 'attract':
        return {
          initial: { opacity: 0, y: 50 },
          animate: { 
            opacity: 1, 
            y: 0,
            transition: { duration: 0.8, ease: "easeOut" }
          },
          exit: { 
            opacity: 0, 
            y: -50,
            transition: { duration: 0.5, ease: "easeIn" }
          }
        };
      
      case 'nameEntry':
        return {
          initial: { opacity: 0, x: 100, rotateY: -15 },
          animate: { 
            opacity: 1, 
            x: 0, 
            rotateY: 0,
            transition: { duration: 0.7, ease: "backOut" }
          },
          exit: { 
            opacity: 0, 
            x: -100, 
            rotateY: 15,
            transition: { duration: 0.5, ease: "easeIn" }
          }
        };
      
      case 'game':
        return {
          initial: { opacity: 0, scale: 0.8 },
          animate: { 
            opacity: 1, 
            scale: 1,
            transition: { 
              duration: 0.6, 
              ease: "easeOut",
              staggerChildren: 0.1
            }
          },
          exit: { 
            opacity: 0, 
            scale: 1.1,
            transition: { duration: 0.4, ease: "easeIn" }
          }
        };
      
      case 'gameOver':
        return {
          initial: { opacity: 0, scale: 1.2, blur: 10 },
          animate: { 
            opacity: 1, 
            scale: 1, 
            blur: 0,
            transition: { 
              duration: 0.8, 
              ease: "backOut",
              staggerChildren: 0.2
            }
          },
          exit: { 
            opacity: 0, 
            scale: 0.8,
            transition: { duration: 0.5, ease: "easeIn" }
          }
        };
      
      default:
        return screenVariants;
    }
  };

  const currentTransition = getScreenTransition(screen);

  return (
    <div className="game-container relative overflow-hidden">
      {/* Global Background Effects */}
      <div className="crt-effect fixed inset-0 pointer-events-none z-50"></div>
      <div className="digital-rain fixed inset-0 pointer-events-none z-10"></div>
      
      {/* Screen Container with Perspective for 3D transitions */}
      <div 
        className="relative w-full h-screen"
        style={{ 
          perspective: '1000px',
          transformStyle: 'preserve-3d'
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            variants={currentTransition}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 w-full h-full"
          >
            {/* Screen Components */}
            {screen === 'attract' && <AttractModeScreen />}
            {screen === 'nameEntry' && <NameEntryScreen />}
            {screen === 'game' && <GameScreen />}
            {screen === 'gameOver' && <GameOverScreen />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Global Loading Overlay (if needed) */}
      <AnimatePresence>
        {/* This could be used for global loading states */}
      </AnimatePresence>

      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 left-4 bg-black/70 text-white p-2 rounded font-mono text-xs z-50">
          Current Screen: {screen}
        </div>
      )}
    </div>
  );
};

export default GameRouter;
