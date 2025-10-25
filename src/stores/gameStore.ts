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
  addLife: () => void;
  
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
  screen: 'attract',
  isPlaying: false,
  isPaused: false,
  gameStarted: false,
  gameEnded: false,
  
  playerName: '',
  lives: 2,
  score: 0,
  highScore: 0,
  
  round: 1,
  combo: 0,
  maxCombo: 0,
  timer: 15,
  maxTimer: 15,
  
  currentImage: null,
  currentPair: null,
  correctAnswer: null,
  lastGuess: null,
  lastResult: null,
  
  totalGamesPlayed: 0,
  totalCorrectGuesses: 0,
  totalWrongGuesses: 0,
  averageScore: 0,
  bestRound: 1,
  
  soundEnabled: true,
  fullscreenEnabled: false,
  debugMode: false,
  
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
        const flow: Record<GameScreen, GameScreen> = {
          attract: 'nameEntry',
          nameEntry: 'game',
          game: 'gameOver',
          gameOver: 'attract',
        };
        set({ screen: flow[screen] || 'attract' });
      },
      
      goToGameOver: () => set({ screen: 'gameOver', isPlaying: false, gameEnded: true }),
      goToAttractMode: () => set({ screen: 'attract', isPlaying: false, gameStarted: false, gameEnded: false }),
      
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

        // ✅ Always add the score to leaderboard when game ends
        if (state.playerName) {
          get().addHighScore({
            name: state.playerName,
            score: state.score,
            round: state.round,
            date: new Date().toISOString(),
            maxCombo: state.maxCombo,
          });
        }

        set({ isPlaying: false, gameEnded: true, screen: 'gameOver' });
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
        const points = isCorrect ? Math.floor(basePoints * comboMultiplier) + timeBonus + roundBonus : 0;
        
        set({ lastGuess: isAI, lastResult: isCorrect ? 'correct' : 'wrong', lastActionTime: Date.now() });
        
        if (isCorrect) {
          get().addScore(points);
          get().incrementCombo();
          get().updateStats(true);
          setTimeout(() => { get().nextRound(); get().loadNextImage(); }, 1000);
        } else {
          get().resetCombo();
          get().loseLife();
          get().updateStats(false);
          if (state.lives <= 1) {
            setTimeout(() => { get().endGame(); }, 1500);
          } else {
            setTimeout(() => { get().loadNextImage(); }, 1500);
          }
        }
      },
      
      setPlayerName: (name: string) => set({ playerName: name.toUpperCase().slice(0, 3) }),
      
      setCurrentImage: (image: GameImage | null) => set({ currentImage: image, correctAnswer: image?.isAI ?? null }),
      loadNextImage: () => { set({ currentImage: null }); get().resetTimer(); },
      
      // Scoring
      addScore: (points: number) => set((s) => ({ score: s.score + points })),
      incrementCombo: () => set((s) => ({ combo: s.combo + 1, maxCombo: Math.max(s.maxCombo, s.combo + 1) })),
      resetCombo: () => set({ combo: 0 }),
      loseLife: () => set((s) => ({ lives: Math.max(0, s.lives - 1) })),
      addLife: () => set((s) => ({ lives: s.lives + 1 })),
      
      // Timer
      setTimer: (time: number) => set({ timer: time }),
      decrementTimer: () => {
        const state = get();
        const newTime = Math.max(0, state.timer - 1);
        set({ timer: newTime });
        if (newTime === 0 && state.isPlaying) {
          get().makeGuess(!state.currentImage?.isAI);
        }
      },
      resetTimer: () => {
        const r = get().round;
        let newMaxTimer = 15;
        if (r > 3 && r <= 6) newMaxTimer = 12;
        else if (r > 6 && r <= 9) newMaxTimer = 10;
        else if (r > 9 && r <= 12) newMaxTimer = 8;
        else if (r > 12) newMaxTimer = 6;
        set({ timer: newMaxTimer, maxTimer: newMaxTimer });
      },
      
      // Rounds
      nextRound: () => set((s) => ({ round: s.round + 1, bestRound: Math.max(s.bestRound, s.round + 1) })),
      setRound: (round: number) => set({ round }),
      
      // Leaderboard (handled by external store)
      addHighScore: (entry: LeaderboardEntry) => console.log('Adding high score:', entry),
      getLeaderboard: (): LeaderboardEntry[] => [],
      isHighScore: (score: number): boolean => {
        const leaderboard = get().getLeaderboard();
        if (leaderboard.length < 10) return true;
        return score > Math.min(...leaderboard.map((e) => e.score));
      },
      
      // Stats
      updateStats: (correct: boolean) => {
        const s = get();
        const total = s.totalCorrectGuesses + s.totalWrongGuesses + 1;
        set({
          totalCorrectGuesses: correct ? s.totalCorrectGuesses + 1 : s.totalCorrectGuesses,
          totalWrongGuesses: correct ? s.totalWrongGuesses : s.totalWrongGuesses + 1,
          averageScore: Math.floor((s.averageScore * (total - 1) + s.score) / total),
        });
      },
      getStats: (): GameStats => {
        const s = get();
        const total = s.totalCorrectGuesses + s.totalWrongGuesses;
        return {
          gamesPlayed: s.totalGamesPlayed,
          totalCorrect: s.totalCorrectGuesses,
          totalWrong: s.totalWrongGuesses,
          accuracy: total > 0 ? (s.totalCorrectGuesses / total) * 100 : 0,
          averageScore: s.averageScore,
          bestScore: s.highScore,
          bestRound: s.bestRound,
          maxCombo: s.maxCombo,
        };
      },
      resetStats: () => set({ totalGamesPlayed: 0, totalCorrectGuesses: 0, totalWrongGuesses: 0, averageScore: 0, bestRound: 1, maxCombo: 0 }),
      
      // Settings
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleFullscreen: () => set((s) => ({ fullscreenEnabled: !s.fullscreenEnabled })),
      
      // Debug
      setDebugMode: (enabled: boolean) => set({ debugMode: enabled }),
      skipToRound: (round: number) => { if (get().debugMode) { set({ round }); get().resetTimer(); } },
    }),
    { name: 'ai-vs-human-game-store',
      partialize: (s) => ({
        playerName: s.playerName,
        highScore: s.highScore,
        soundEnabled: s.soundEnabled,
        fullscreenEnabled: s.fullscreenEnabled,
        totalGamesPlayed: s.totalGamesPlayed,
        totalCorrectGuesses: s.totalCorrectGuesses,
        totalWrongGuesses: s.totalWrongGuesses,
        averageScore: s.averageScore,
        bestRound: s.bestRound,
        maxCombo: s.maxCombo,
      }),
    }
  )
);

// Leaderboard store remains unchanged
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
      addEntry: (entry) => {
        set((s) => {
          const newEntries = [...s.entries, entry].sort((a, b) => b.score - a.score).slice(0, 10);
          return { entries: newEntries };
        });
      },
      getTop10: () => get().entries.slice(0, 10),
      isHighScore: (score) => {
        const entries = get().entries;
        if (entries.length < 10) return true;
        return score > Math.min(...entries.map((e) => e.score));
      },
      clearAll: () => set({ entries: [] }),
    }),
    { name: 'ai-vs-human-leaderboard' }
  )
);

export const useGameWithLeaderboard = () => {
  const gameStore = useGameStore();
  const leaderboardStore = useLeaderboardStore();
  return {
    ...gameStore,
    addHighScore: (entry: LeaderboardEntry) => leaderboardStore.addEntry(entry),
    getLeaderboard: () => leaderboardStore.getTop10(),
    isHighScore: (score: number) => leaderboardStore.isHighScore(score),
  };
};
