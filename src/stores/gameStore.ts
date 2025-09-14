import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameState, GameScreen, GameImage, LeaderboardEntry, GameStats } from '@/types/game';

interface GameStore extends GameState {
  // Screen navigation
  setScreen: (screen: GameScreen) => void;
  nextScreen: () => void;
  goToGameOver: () => void;
  goToAttractMode: () => void;
  
  // Game lifecycle
  startNewGame: () => void;
  endGame: () => void;
  resetGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  
  // Player actions
  makeGuess: (isAI: boolean) => void;
  setPlayerName: (name: string) => void;
  
  // Image management
  setCurrentImage: (image: GameImage | null) => void;
  loadNextImage: () => void;
  
  // Scoring system
  addScore: (points: number) => void;
  incrementCombo: () => void;
  resetCombo: () => void;
  loseLife: () => void;
  addLife: () => void; // For Konami code bonus
  
  // Timer management
  setTimer: (time: number) => void;
  decrementTimer: () => void;
  resetTimer: () => void;
  
  // Round progression
  nextRound: () => void;
  setRound: (round: number) => void;
  
  // Leaderboard
  addHighScore: (entry: LeaderboardEntry) => void;
  getLeaderboard: () => LeaderboardEntry[];
  isHighScore: (score: number) => boolean;
  
  // Game statistics
  updateStats: (correct: boolean) => void;
  getStats: () => GameStats;
  resetStats: () => void;
  
  // Settings and preferences
  toggleSound: () => void;
  toggleFullscreen: () => void;
  
  // Debug and development
  setDebugMode: (enabled: boolean) => void;
  skipToRound: (round: number) => void;
}

const initialGameState: GameState = {
  // Game flow
  screen: 'attract',
  isPlaying: false,
  isPaused: false,
  gameStarted: false,
  gameEnded: false,
  
  // Player data
  playerName: '',
  lives: 2,
  score: 0,
  highScore: 0,
  
  // Game progression
  round: 1,
  combo: 0,
  maxCombo: 0,
  timer: 15,
  maxTimer: 15,
  
  // Current game data
  currentImage: null,
  correctAnswer: null,
  lastGuess: null,
  lastResult: null,
  
  // Statistics
  totalGamesPlayed: 0,
  totalCorrectGuesses: 0,
  totalWrongGuesses: 0,
  averageScore: 0,
  bestRound: 1,
  
  // Settings
  soundEnabled: true,
  fullscreenEnabled: false,
  debugMode: false,
  
  // Performance tracking
  imagesPreloaded: 0,
  gameStartTime: null,
  lastActionTime: null,
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialGameState,
      
      // Screen navigation
      setScreen: (screen: GameScreen) => set({ screen }),
      
      nextScreen: () => {
        const { screen } = get();
        const screenFlow: Record<GameScreen, GameScreen> = {
          'attract': 'nameEntry',
          'nameEntry': 'game',
          'game': 'gameOver',
          'gameOver': 'attract',
        };
        set({ screen: screenFlow[screen] || 'attract' });
      },
      
      goToGameOver: () => set({ 
        screen: 'gameOver', 
        isPlaying: false, 
        gameEnded: true 
      }),
      
      goToAttractMode: () => set({ 
        screen: 'attract', 
        isPlaying: false, 
        gameStarted: false,
        gameEnded: false 
      }),
      
      // Game lifecycle
      startNewGame: () => {
        const state = get();
        const newHighScore = Math.max(state.score, state.highScore);
        
        set({
          ...initialGameState,
          screen: 'game',
          isPlaying: true,
          gameStarted: true,
          gameEnded: false,
          playerName: state.playerName,
          highScore: newHighScore,
          soundEnabled: state.soundEnabled,
          fullscreenEnabled: state.fullscreenEnabled,
          debugMode: state.debugMode,
          gameStartTime: Date.now(),
          totalGamesPlayed: state.totalGamesPlayed + 1,
        });
      },
      
      endGame: () => {
        const state = get();
        const isNewHighScore = state.score > state.highScore;
        
        if (isNewHighScore) {
          set({ highScore: state.score });
        }
        
        // Add to leaderboard if it's a high score
        if (state.playerName && get().isHighScore(state.score)) {
          get().addHighScore({
            name: state.playerName,
            score: state.score,
            round: state.round,
            date: new Date().toISOString(),
            maxCombo: state.maxCombo,
          });
        }
        
        set({
          isPlaying: false,
          gameEnded: true,
          screen: 'gameOver',
        });
      },
      
      resetGame: () => {
        const state = get();
        set({
          ...initialGameState,
          playerName: state.playerName,
          highScore: state.highScore,
          soundEnabled: state.soundEnabled,
          fullscreenEnabled: state.fullscreenEnabled,
          debugMode: state.debugMode,
          totalGamesPlayed: state.totalGamesPlayed,
          totalCorrectGuesses: state.totalCorrectGuesses,
          totalWrongGuesses: state.totalWrongGuesses,
          averageScore: state.averageScore,
          bestRound: state.bestRound,
        });
      },
      
      pauseGame: () => set({ isPaused: true, isPlaying: false }),
      
      resumeGame: () => set({ isPaused: false, isPlaying: true }),
      
      // Player actions
      makeGuess: (isAI: boolean) => {
        const state = get();
        if (!state.currentImage || !state.isPlaying) return;
        
        const isCorrect = isAI === state.currentImage.isAI;
        const basePoints = 100;
        const comboMultiplier = Math.max(1, state.combo * 0.5);
        const timeBonus = Math.floor(state.timer * 10);
        const roundBonus = Math.floor(state.round * 5);
        
        const points = isCorrect 
          ? Math.floor(basePoints * comboMultiplier) + timeBonus + roundBonus
          : 0;
        
        set({
          lastGuess: isAI,
          lastResult: isCorrect ? 'correct' : 'wrong',
          lastActionTime: Date.now(),
        });
        
        if (isCorrect) {
          get().addScore(points);
          get().incrementCombo();
          get().updateStats(true);
          
          // Progress to next round after short delay
          setTimeout(() => {
            get().nextRound();
            get().loadNextImage();
          }, 1000);
        } else {
          get().resetCombo();
          get().loseLife();
          get().updateStats(false);
          
          // Check if game should end
          if (state.lives <= 1) {
            setTimeout(() => {
              get().endGame();
            }, 1500);
          } else {
            // Continue with next image after penalty delay
            setTimeout(() => {
              get().loadNextImage();
            }, 1500);
          }
        }
      },
      
      setPlayerName: (name: string) => set({ playerName: name.toUpperCase().slice(0, 3) }),
      
      // Image management
      setCurrentImage: (image: GameImage | null) => set({ 
        currentImage: image,
        correctAnswer: image?.isAI ?? null,
      }),
      
      loadNextImage: () => {
        // Clear current image and reset timer for next image
        set({ currentImage: null });
        get().resetTimer();
      },
      
      // Scoring system
      addScore: (points: number) => set((state) => ({ 
        score: state.score + points 
      })),
      
      incrementCombo: () => set((state) => ({
        combo: state.combo + 1,
        maxCombo: Math.max(state.maxCombo, state.combo + 1),
      })),
      
      resetCombo: () => set({ combo: 0 }),
      
      loseLife: () => set((state) => ({ 
        lives: Math.max(0, state.lives - 1) 
      })),
      
      addLife: () => set((state) => ({ 
        lives: state.lives + 1 
      })),
      
      // Timer management
      setTimer: (time: number) => set({ timer: time }),
      
      decrementTimer: () => {
        const state = get();
        const newTime = Math.max(0, state.timer - 1);
        
        set({ timer: newTime });
        
        // Auto-lose if timer reaches 0
        if (newTime === 0 && state.isPlaying) {
          get().makeGuess(!state.currentImage?.isAI); // Force wrong answer
        }
      },
      
      resetTimer: () => {
        const state = get();
        // Timer gets shorter as rounds progress (piecewise for stronger difficulty ramp)
        const r = state.round;
        let newMaxTimer = 15; // generous early rounds
        if (r <= 3) newMaxTimer = 15;
        else if (r <= 6) newMaxTimer = 12;
        else if (r <= 9) newMaxTimer = 10;
        else if (r <= 12) newMaxTimer = 8;
        else newMaxTimer = 6; // fast decision making in late game

        set({
          timer: newMaxTimer,
          maxTimer: newMaxTimer,
        });
      },
      
      // Round progression
      nextRound: () => set((state) => ({ 
        round: state.round + 1,
        bestRound: Math.max(state.bestRound, state.round + 1),
      })),
      
      setRound: (round: number) => set({ round }),
      
      // Leaderboard (persisted separately)
      addHighScore: (entry: LeaderboardEntry) => {
        // This will be handled by the leaderboard store
        console.log('Adding high score:', entry);
      },
      
      getLeaderboard: (): LeaderboardEntry[] => {
        // This will be handled by the leaderboard store
        return [];
      },
      
      isHighScore: (score: number): boolean => {
        const leaderboard = get().getLeaderboard();
        if (leaderboard.length < 10) return true;
        return score > Math.min(...leaderboard.map(entry => entry.score));
      },
      
      // Game statistics
      updateStats: (correct: boolean) => {
        const state = get();
        const totalGuesses = state.totalCorrectGuesses + state.totalWrongGuesses + 1;
        
        set({
          totalCorrectGuesses: correct 
            ? state.totalCorrectGuesses + 1 
            : state.totalCorrectGuesses,
          totalWrongGuesses: correct 
            ? state.totalWrongGuesses 
            : state.totalWrongGuesses + 1,
          averageScore: Math.floor(
            (state.averageScore * (totalGuesses - 1) + state.score) / totalGuesses
          ),
        });
      },
      
      getStats: (): GameStats => {
        const state = get();
        const totalGuesses = state.totalCorrectGuesses + state.totalWrongGuesses;
        
        return {
          gamesPlayed: state.totalGamesPlayed,
          totalCorrect: state.totalCorrectGuesses,
          totalWrong: state.totalWrongGuesses,
          accuracy: totalGuesses > 0 ? (state.totalCorrectGuesses / totalGuesses) * 100 : 0,
          averageScore: state.averageScore,
          bestScore: state.highScore,
          bestRound: state.bestRound,
          maxCombo: state.maxCombo,
        };
      },
      
      resetStats: () => set({
        totalGamesPlayed: 0,
        totalCorrectGuesses: 0,
        totalWrongGuesses: 0,
        averageScore: 0,
        bestRound: 1,
        maxCombo: 0,
      }),
      
      // Settings and preferences
      toggleSound: () => set((state) => ({ 
        soundEnabled: !state.soundEnabled 
      })),
      
      toggleFullscreen: () => set((state) => ({ 
        fullscreenEnabled: !state.fullscreenEnabled 
      })),
      
      // Debug and development
      setDebugMode: (enabled: boolean) => set({ debugMode: enabled }),
      
      skipToRound: (round: number) => {
        if (get().debugMode) {
          set({ round });
          get().resetTimer();
        }
      },
    }),
    {
      name: 'ai-vs-human-game-store',
      partialize: (state) => ({
        // Persist only user preferences and statistics
        playerName: state.playerName,
        highScore: state.highScore,
        soundEnabled: state.soundEnabled,
        fullscreenEnabled: state.fullscreenEnabled,
        totalGamesPlayed: state.totalGamesPlayed,
        totalCorrectGuesses: state.totalCorrectGuesses,
        totalWrongGuesses: state.totalWrongGuesses,
        averageScore: state.averageScore,
        bestRound: state.bestRound,
        maxCombo: state.maxCombo,
      }),
    }
  )
);

// Separate leaderboard store for better organization
interface LeaderboardStore {
  entries: LeaderboardEntry[];
  addEntry: (entry: LeaderboardEntry) => void;
  getTop10: () => LeaderboardEntry[];
  isHighScore: (score: number) => boolean;
  clearAll: () => void;
}

export const useLeaderboardStore = create<LeaderboardStore>()(
  persist(
    (set, get) => ({
      entries: [],
      
      addEntry: (entry: LeaderboardEntry) => {
        set((state) => {
          const newEntries = [...state.entries, entry]
            .sort((a, b) => b.score - a.score)
            .slice(0, 10); // Keep only top 10
          
          return { entries: newEntries };
        });
      },
      
      getTop10: () => get().entries.slice(0, 10),
      
      isHighScore: (score: number) => {
        const entries = get().entries;
        if (entries.length < 10) return true;
        return score > Math.min(...entries.map(entry => entry.score));
      },
      
      clearAll: () => set({ entries: [] }),
    }),
    {
      name: 'ai-vs-human-leaderboard',
    }
  )
);

// Hook to connect game store with leaderboard store
export const useGameWithLeaderboard = () => {
  const gameStore = useGameStore();
  const leaderboardStore = useLeaderboardStore();
  
  // Override the leaderboard methods to use the separate store
  const addHighScore = (entry: LeaderboardEntry) => {
    leaderboardStore.addEntry(entry);
  };
  
  const getLeaderboard = () => {
    return leaderboardStore.getTop10();
  };
  
  const isHighScore = (score: number) => {
    return leaderboardStore.isHighScore(score);
  };
  
  return {
    ...gameStore,
    addHighScore,
    getLeaderboard,
    isHighScore,
  };
};
