import { useEffect, useCallback } from 'react';
import { useGameWithLeaderboard } from '@/stores/gameStore';
import { useSound } from '@/hooks/useSoundManager';

/**
 * Custom hook that provides game logic and timer management
 * This hook manages the game timer and automatic game progression
 */
export const useGameLogic = () => {
  const gameStore = useGameWithLeaderboard();
  const { soundManager } = useSound();
  
  // Effect for handling correct/wrong answer sounds
  useEffect(() => {
    if (gameStore.lastResult === 'correct') {
      soundManager?.playSound('correct');
      if (gameStore.combo > 1) {
        soundManager?.playComboSound(gameStore.combo);
      }
    } else if (gameStore.lastResult === 'wrong') {
      soundManager?.playSound('wrong');
    }
  }, [gameStore.lastResult, gameStore.combo, soundManager]);

  // Timer countdown effect
  useEffect(() => {
    if (!gameStore.isPlaying || gameStore.isPaused) return;

    // Accelerate timer as rounds increase (shorter tick interval)
    const getTickInterval = (round: number) => {
      if (round <= 3) return 1000; // 1s per tick
      if (round <= 6) return 850;
      if (round <= 9) return 700;
      if (round <= 12) return 550;
      return 400; // very fast late game
    };

    const intervalMs = getTickInterval(gameStore.round);
    const timerInterval = setInterval(() => {
      gameStore.decrementTimer();
      if (gameStore.timer > 0 && gameStore.timer <= 3) {
        soundManager?.playSound('tick', 0.8);
      }
    }, intervalMs);

    return () => clearInterval(timerInterval);
  }, [gameStore.isPlaying, gameStore.isPaused, gameStore.decrementTimer, gameStore.round, gameStore.timer, soundManager]);
  
  // Auto-progress to next screen after delays
  useEffect(() => {
    if (gameStore.lastResult === 'correct') {
      const timeout = setTimeout(() => {
        gameStore.loadNextImage();
      }, 1000);
      
      return () => clearTimeout(timeout);
    }
    
    if (gameStore.lastResult === 'wrong' && gameStore.lives > 0) {
      const timeout = setTimeout(() => {
        gameStore.loadNextImage();
      }, 1500);
      
      return () => clearTimeout(timeout);
    }
  }, [gameStore.lastResult, gameStore.lives, gameStore.loadNextImage]);
  
  // Keyboard controls
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Allow controls when playing, and allow Escape to work while paused
    if (!gameStore.isPlaying && !gameStore.isPaused) return;
    
    const { key } = event;
    
    // AI Generated controls
    if (['ArrowLeft', 'a', 'A', '1'].includes(key)) {
      event.preventDefault();
      gameStore.makeGuess(true);
    }
    
    // Human Captured controls  
    if (['ArrowRight', 'd', 'D', '2'].includes(key)) {
      event.preventDefault();
      gameStore.makeGuess(false);
    }
    
    // Pause/Resume
    if (key === 'Escape') {
      event.preventDefault();
      if (gameStore.isPaused) {
        gameStore.resumeGame();
      } else {
        gameStore.pauseGame();
      }
    }
  }, [gameStore]);
  
  // Set up keyboard listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);
  
  // Game initialization helper
  const initializeGame = useCallback(async () => {
    // This will be called when we integrate the ImageManager
    console.log('Game initialized with store');
  }, []);
  
  // Helper functions for game stats
  const getAccuracy = useCallback(() => {
    const stats = gameStore.getStats();
    return stats.accuracy;
  }, [gameStore]);
  
  const getGameProgress = useCallback(() => {
    return {
      round: gameStore.round,
      score: gameStore.score,
      lives: gameStore.lives,
      combo: gameStore.combo,
      timer: gameStore.timer,
      isPlaying: gameStore.isPlaying,
      isPaused: gameStore.isPaused,
    };
  }, [gameStore]);
  
  const getLeaderboardPosition = useCallback((score: number) => {
    const leaderboard = gameStore.getLeaderboard();
    const position = leaderboard.findIndex(entry => score >= entry.score);
    return position === -1 ? leaderboard.length + 1 : position + 1;
  }, [gameStore]);
  
  return {
    // Game store methods and state
    ...gameStore,
    
    // Helper methods
    initializeGame,
    getAccuracy,
    getGameProgress,
    getLeaderboardPosition,
    
    // Computed values
    isHighScoreCandidate: gameStore.isHighScore(gameStore.score),
    timePercentage: (gameStore.timer / gameStore.maxTimer) * 100,
    progressPercentage: ((gameStore.round - 1) / 20) * 100, // Assuming 20 rounds is good progress
  };
};

/**
 * Hook for managing attract mode functionality
 */
export const useAttractMode = () => {
  const { screen, setScreen, goToAttractMode } = useGameWithLeaderboard();
  
  // Auto-return to attract mode after inactivity
  useEffect(() => {
    if (screen === 'attract') return;
    
    const inactivityTimeout = setTimeout(() => {
      goToAttractMode();
    }, 60000); // 1 minute of inactivity
    
    return () => clearTimeout(inactivityTimeout);
  }, [screen, goToAttractMode]);
  
  return {
    isAttractMode: screen === 'attract',
    goToAttractMode,
    setScreen,
  };
};

/**
 * Hook for managing game settings and preferences
 */
export const useGameSettings = () => {
  const { 
    soundEnabled, 
    fullscreenEnabled, 
    debugMode,
    toggleSound, 
    toggleFullscreen, 
    setDebugMode,
    resetStats,
  } = useGameWithLeaderboard();
  
  const toggleFullscreenMode = useCallback(async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
        toggleFullscreen();
      } catch (error) {
        console.error('Failed to enter fullscreen:', error);
      }
    } else {
      try {
        await document.exitFullscreen();
        toggleFullscreen();
      } catch (error) {
        console.error('Failed to exit fullscreen:', error);
      }
    }
  }, [toggleFullscreen]);
  
  return {
    soundEnabled,
    fullscreenEnabled,
    debugMode,
    toggleSound,
    toggleFullscreenMode,
    setDebugMode,
    resetStats,
  };
};
