'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameWithLeaderboard } from '@/stores/gameStore';

/**
 * Game Over Screen - Final score display, high score detection, and play again
 * Shows detailed game statistics and leaderboard position
 */
export const GameOverScreen: React.FC = () => {
  const gameStore = useGameWithLeaderboard();
  const [showStats, setShowStats] = useState(false);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [leaderboardPosition, setLeaderboardPosition] = useState<number | null>(null);
  
  const stats = gameStore.getStats();
  const leaderboard = gameStore.getLeaderboard();

  // Check for high score and calculate position
  useEffect(() => {
    const isHigh = gameStore.score > gameStore.highScore || gameStore.isHighScore(gameStore.score);
    setIsNewHighScore(isHigh);
    
    if (isHigh) {
      const position = leaderboard.findIndex(entry => gameStore.score >= entry.score);
      setLeaderboardPosition(position === -1 ? leaderboard.length + 1 : position + 1);
    }

    // Show stats after initial animation
    const timer = setTimeout(() => setShowStats(true), 1500);
    return () => clearTimeout(timer);
  }, [gameStore, leaderboard]);

  // Handle play again
  const handlePlayAgain = () => {
    gameStore.setScreen('nameEntry');
  };

  // Handle return to attract mode
  const handleMainMenu = () => {
    gameStore.goToAttractMode();
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault();
          handlePlayAgain();
          break;
        case 'Escape':
          event.preventDefault();
          handleMainMenu();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Calculate performance grade
  const getPerformanceGrade = () => {
    if (stats.accuracy >= 90) return { grade: 'S', color: 'neon-yellow', message: 'PERFECT!' };
    if (stats.accuracy >= 80) return { grade: 'A', color: 'neon-green', message: 'EXCELLENT!' };
    if (stats.accuracy >= 70) return { grade: 'B', color: 'neon-blue', message: 'GREAT!' };
    if (stats.accuracy >= 60) return { grade: 'C', color: 'neon-cyan', message: 'GOOD!' };
    if (stats.accuracy >= 50) return { grade: 'D', color: 'neon-orange', message: 'OKAY' };
    return { grade: 'F', color: 'neon-red', message: 'PRACTICE MORE!' };
  };

  const performance = getPerformanceGrade();

  return (
    <div className="screen center relative">
      {/* Background Effects */}
      <div className="crt-effect"></div>
      <div className="digital-rain opacity-20"></div>
      
      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-screen w-full max-w-6xl mx-auto px-8 relative z-10">
        <div className="flex flex-col items-center justify-center gap-12 w-full py-8">
        
          {/* Game Over Title */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "backOut" }}
            className="text-center"
          >
            <h1 className="font-arcade text-6xl md:text-8xl text-glow-red mb-4">
              GAME OVER
            </h1>
            {isNewHighScore && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="font-arcade text-2xl text-glow-yellow pulse-glow"
              >
                🏆 NEW HIGH SCORE! 🏆
              </motion.div>
            )}
          </motion.div>

          {/* Main Stats Display */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full"
          >
          
            {/* Final Score */}
            <div className="arcade-border p-8 text-center rounded-lg">
              <h2 className="font-arcade text-2xl text-glow-green mb-6">FINAL SCORE</h2>
              <motion.div
                className="text-6xl font-arcade text-glow-yellow mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
              >
                {gameStore.score.toLocaleString()}
              </motion.div>
              <div className="space-y-2">
                <div className="font-mono text-sm text-glow-cyan">
                  Player: {gameStore.playerName}
                </div>
                <div className="font-mono text-sm text-glow-cyan">
                  Round: {gameStore.round}
                </div>
                {leaderboardPosition && (
                  <div className="font-mono text-sm text-glow-yellow">
                    Leaderboard: #{leaderboardPosition}
                  </div>
                )}
              </div>
            </div>

            {/* Performance Grade */}
            <div className="arcade-border p-8 text-center rounded-lg">
              <h2 className="font-arcade text-2xl text-glow-green mb-6">PERFORMANCE</h2>
              <motion.div
                className={`text-8xl font-arcade text-${performance.color} mb-4`}
                initial={{ rotateY: 180, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ delay: 1, duration: 0.8 }}
              >
                {performance.grade}
              </motion.div>
              <div className={`font-mono text-lg text-${performance.color} mb-4`}>
                {performance.message}
              </div>
              <div className="space-y-2">
                <div className="font-mono text-sm text-glow-cyan">
                  Accuracy: {stats.accuracy.toFixed(1)}%
                </div>
                <div className="font-mono text-sm text-glow-cyan">
                  Max Combo: {gameStore.maxCombo}x
                </div>
              </div>
            </div>

            {/* Game Summary */}
            <div className="arcade-border p-8 rounded-lg">
              <h2 className="font-arcade text-2xl text-glow-green mb-6 text-center">SUMMARY</h2>
              <div className="space-y-4 font-mono text-sm">
                <div className="flex justify-between">
                  <span>Correct Guesses:</span>
                  <span className="text-green-400">{stats.totalCorrect}</span>
                </div>
                <div className="flex justify-between">
                  <span>Wrong Guesses:</span>
                  <span className="text-red-400">{stats.totalWrong}</span>
                </div>
                <div className="flex justify-between">
                  <span>Best Round:</span>
                  <span className="text-neon-yellow">{stats.bestRound}</span>
                </div>
                <div className="flex justify-between">
                  <span>Games Played:</span>
                  <span className="text-neon-cyan">{stats.gamesPlayed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Score:</span>
                  <span className="text-neon-purple">{stats.averageScore}</span>
                </div>
                <div className="flex justify-between">
                  <span>All-Time Best:</span>
                  <span className="text-neon-green">{stats.bestScore.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Detailed Stats (Expandable) */}
          <AnimatePresence>
            {showStats && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full"
              >
                <div className="arcade-border p-8 rounded-lg">
                  <h2 className="font-arcade text-xl text-glow-blue mb-6 text-center">
                    LEADERBOARD
                  </h2>
                  {leaderboard.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {leaderboard.slice(0, 10).map((entry, index) => (
                        <motion.div
                          key={`${entry.name}-${entry.score}`}
                          initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className={`flex justify-between items-center p-4 rounded-lg ${
                            entry.name === gameStore.playerName && entry.score === gameStore.score
                              ? 'bg-neon-yellow/20 border border-neon-yellow'
                              : 'bg-gray-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-neon-yellow font-bold w-8">
                              {index + 1}.
                            </span>
                            <span className="text-neon-green font-mono">
                              {entry.name}
                            </span>
                          </div>
                          <div className="text-right font-mono text-sm">
                            <div className="text-neon-cyan">
                              {entry.score.toLocaleString()}
                            </div>
                            <div className="text-gray-400 text-xs">
                              R{entry.round} • {entry.maxCombo}x
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 font-mono">
                      No scores yet - you're the first!
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="flex flex-col sm:flex-row gap-6"
          >
            <motion.button
              onClick={handlePlayAgain}
              className="btn-neon pulse-glow text-2xl px-12 py-4"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              PLAY AGAIN
            </motion.button>
            
            <motion.button
              onClick={handleMainMenu}
              className="btn-neon-blue text-xl px-8 py-4"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              MAIN MENU
            </motion.button>
          </motion.div>

          {/* Controls Hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="text-center font-mono text-sm text-glow-cyan"
          >
            <div className="mb-2">ENTER: Play Again • ESC: Main Menu</div>
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Thanks for playing AI vs Human!
            </motion.div>
          </motion.div>

        </div>

        {/* High Score Celebration */}
        {isNewHighScore && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 2.5, duration: 0.8 }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* Confetti-like particles */}
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-neon-yellow rounded-full"
                initial={{
                  x: '50%',
                  y: '50%',
                  scale: 0,
                }}
                animate={{
                  x: `${50 + (Math.random() - 0.5) * 100}%`,
                  y: `${50 + (Math.random() - 0.5) * 100}%`,
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.1,
                  ease: "easeOut"
                }}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default GameOverScreen;
