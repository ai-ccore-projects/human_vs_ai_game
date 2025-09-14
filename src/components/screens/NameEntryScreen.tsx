'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useGameWithLeaderboard } from '@/stores/gameStore';

/**
 * Name Entry Screen - Arcade-style 3-letter name input
 * Classic arcade experience with keyboard navigation
 */
export const NameEntryScreen: React.FC = () => {
  const gameStore = useGameWithLeaderboard();
  const [currentName, setCurrentName] = useState(['A', 'A', 'A']);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isEntering, setIsEntering] = useState(false);
  
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');

  // Handle character selection
  const selectCharacter = useCallback((direction: 'up' | 'down') => {
    setCurrentName(prev => {
      const newName = [...prev];
      const currentCharIndex = alphabet.indexOf(newName[selectedIndex]);
      
      if (direction === 'up') {
        const nextIndex = (currentCharIndex + 1) % alphabet.length;
        newName[selectedIndex] = alphabet[nextIndex];
      } else {
        const prevIndex = currentCharIndex === 0 ? alphabet.length - 1 : currentCharIndex - 1;
        newName[selectedIndex] = alphabet[prevIndex];
      }
      
      return newName;
    });
  }, [selectedIndex, alphabet]);

  // Handle position navigation
  const navigatePosition = useCallback((direction: 'left' | 'right') => {
    if (direction === 'left') {
      setSelectedIndex(prev => prev === 0 ? 2 : prev - 1);
    } else {
      setSelectedIndex(prev => prev === 2 ? 0 : prev + 1);
    }
  }, []);

  // Confirm name entry
  const confirmName = useCallback(() => {
    const name = currentName.join('');
    gameStore.setPlayerName(name);
    setIsEntering(true);
    
    // Short delay for visual feedback
    setTimeout(() => {
      gameStore.startNewGame();
    }, 800);
  }, [currentName, gameStore]);

  // Go back to attract mode
  const goBack = useCallback(() => {
    gameStore.setScreen('attract');
  }, [gameStore]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      event.preventDefault();
      
      switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          selectCharacter('up');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          selectCharacter('down');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          navigatePosition('left');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          navigatePosition('right');
          break;
        case 'Enter':
        case ' ':
          confirmName();
          break;
        case 'Escape':
          goBack();
          break;
        // Direct character input
        default:
          if (event.key.length === 1 && alphabet.includes(event.key.toUpperCase())) {
            setCurrentName(prev => {
              const newName = [...prev];
              newName[selectedIndex] = event.key.toUpperCase();
              return newName;
            });
            // Auto-advance to next position
            if (selectedIndex < 2) {
              setSelectedIndex(prev => prev + 1);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectCharacter, navigatePosition, confirmName, goBack, selectedIndex, alphabet]);

  // Auto-advance demo
  useEffect(() => {
    const demoInterval = setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance to change character
        selectCharacter(Math.random() > 0.5 ? 'up' : 'down');
      }
    }, 2000);

    return () => clearInterval(demoInterval);
  }, [selectCharacter]);

  return (
    <div className="screen center relative">
      {/* Video Backdrop */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
        <video
          className="absolute inset-0 w-full h-full object-cover opacity-70"
          autoPlay
          loop
          muted
          playsInline
          style={{
            filter: 'brightness(0.8) contrast(1.1)',
          }}
        >
          <source src="/Video/172156-846731269_medium.mp4" type="video/mp4" />
        </video>
        {/* Video overlay to ensure readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40 z-10"></div>
      </div>
      
      {/* Background Effects */}
      <div className="crt-effect"></div>
      <div className="digital-rain"></div>
      
      {/* Main Content - Centered arcade layout with consistent spacing */}
      <div className="flex flex-col items-center justify-center min-h-screen w-full max-w-4xl mx-auto px-8 py-10 relative z-20 gap-16">
        
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h1 className="font-arcade text-4xl md:text-6xl text-glow-green mb-4">
            ENTER NAME
          </h1>
          <p className="font-mono text-lg text-glow-cyan">
            3 CHARACTERS MAXIMUM
          </p>
        </motion.div>

        {/* Name Input Display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="arcade-border p-10 rounded-lg"
        >
          <div className="flex justify-center gap-8">
            {currentName.map((char, index) => (
              <motion.div
                key={index}
                className={`relative ${selectedIndex === index ? 'selected' : ''}`}
                animate={selectedIndex === index ? {
                  scale: [1, 1.1, 1],
                  rotateY: [0, 5, -5, 0]
                } : {}}
                transition={{ duration: 0.5, repeat: selectedIndex === index ? Infinity : 0 }}
              >
                {/* Character Display */}
                <div className={`
                  text-6xl md:text-8xl font-arcade text-center
                  w-20 h-20 md:w-24 md:h-24 
                  flex items-center justify-center
                  border-2 rounded-lg
                  ${selectedIndex === index 
                    ? 'border-neon-cyan text-glow-cyan bg-neon-cyan/10' 
                    : 'border-neon-green text-glow-green'
                  }
                `}>
                  {char}
                </div>
                
                {/* Selection Indicator */}
                {selectedIndex === index && (
                  <>
                    <motion.div
                      className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-neon-cyan"
                      animate={{ y: [-2, 2, -2] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      ▲
                    </motion.div>
                    <motion.div
                      className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-neon-cyan"
                      animate={{ y: [2, -2, 2] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      ▼
                    </motion.div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Controls Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl"
        >
          <div className="arcade-border p-6 rounded-md">
            <h3 className="font-arcade text-lg text-glow-blue mb-3 text-center">
              NAVIGATION
            </h3>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between">
                <span>↑↓ or W/S:</span>
                <span className="text-neon-cyan">Change Letter</span>
              </div>
              <div className="flex justify-between">
                <span>←→ or A/D:</span>
                <span className="text-neon-cyan">Move Position</span>
              </div>
              <div className="flex justify-between">
                <span>Type:</span>
                <span className="text-neon-cyan">Direct Input</span>
              </div>
            </div>
          </div>
          
          <div className="arcade-border p-6 rounded-md">
            <h3 className="font-arcade text-lg text-glow-blue mb-3 text-center">
              ACTIONS
            </h3>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between">
                <span>ENTER:</span>
                <span className="text-neon-green">Confirm Name</span>
              </div>
              <div className="flex justify-between">
                <span>SPACE:</span>
                <span className="text-neon-green">Start Game</span>
              </div>
              <div className="flex justify-between">
                <span>ESC:</span>
                <span className="text-neon-red">Go Back</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex gap-6"
        >
          <button
            onClick={goBack}
            className="btn-neon-red px-8 py-3"
          >
            ← BACK
          </button>
          
          <motion.button
            onClick={confirmName}
            disabled={isEntering}
            className={`btn-neon pulse-glow px-12 py-3 text-xl ${isEntering ? 'opacity-50' : ''}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isEntering ? 'STARTING...' : 'START GAME'}
          </motion.button>
        </motion.div>

        {/* Preview Name */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-center"
        >
          <p className="font-mono text-sm text-glow-yellow">
            Player Name: <span className="text-neon-green font-bold">{currentName.join('')}</span>
          </p>
        </motion.div>

        {/* Entering Animation */}
        {isEntering && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-black/50 z-20"
          >
            <div className="text-center">
              <motion.div
                className="text-6xl font-arcade text-glow-green mb-4"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                INITIALIZING...
              </motion.div>
              <motion.div
                className="flex justify-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-3 h-3 bg-neon-cyan rounded-full"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ 
                      duration: 1, 
                      repeat: Infinity, 
                      delay: i * 0.2 
                    }}
                  />
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default NameEntryScreen;
