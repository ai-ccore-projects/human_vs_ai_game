// src/types/game.ts

// ---------------- Existing types (kept as-is) ----------------

export type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme';

export interface GameImage {
  id: string;
  url: string;
  isAI: boolean;
  source?: string;
  round?: number;
  difficulty?: Difficulty;
}

export interface GameImagePair {
  ai: GameImage;
  human: GameImage;
  round: number;
  difficulty: Difficulty;
  aiIndex: 0 | 1;                // index in images[] where the AI image sits
  images: [GameImage, GameImage]; // [left, right]
}

/** Screens in the game flow */
export type GameScreen = 'attract' | 'nameEntry' | 'game' | 'gameOver';

/** One row in the leaderboard */
export interface LeaderboardEntry {
  name: string;          // typically 3-char initials
  score: number;
  round: number;
  date: string;          // ISO string
  maxCombo: number;
}

/** Aggregate stats returned by getStats() */
export interface GameStats {
  gamesPlayed: number;
  totalCorrect: number;
  totalWrong: number;
  accuracy: number;      // percentage 0..100
  averageScore: number;
  bestScore: number;
  bestRound: number;
  maxCombo: number;
}

/** Full game state held in the zustand store */
export interface GameState {
  // Screen & lifecycle
  screen: GameScreen;
  isPlaying: boolean;
  isPaused: boolean;
  gameStarted: boolean;
  gameEnded: boolean;

  // Player & score
  playerName: string;      // stored as 3-char uppercase
  lives: number;
  score: number;
  highScore: number;

  // Rounds & combo
  round: number;
  combo: number;
  maxCombo: number;

  // Timer
  timer: number;
  maxTimer: number;

  // Current image/pair & answers
  currentImage: GameImage | null;
  currentPair: GameImagePair | null;
  correctAnswer: boolean | null;      // true if AI, false if human, null if N/A
  lastGuess: boolean | null;          // what the user last picked
  lastResult: 'correct' | 'wrong' | null;

  // Stats
  totalGamesPlayed: number;
  totalCorrectGuesses: number;
  totalWrongGuesses: number;
  averageScore: number;
  bestRound: number;

  // Preferences
  soundEnabled: boolean;
  fullscreenEnabled: boolean;
  debugMode: boolean;

  // Misc/telemetry
  imagesPreloaded: number;
  gameStartTime: number | null;       // ms epoch
  lastActionTime: number | null;      // ms epoch
}

// ---------------- New exports used by constants.ts ----------------

/** Animation config used by ANIMATION_CONFIG in src/utils/constants.ts */
export interface AnimationConfig {
  screenTransition: number;
  buttonHover: number;
  correctAnswer: number;
  wrongAnswer: number;
  particleDuration: number;
  screenShake: { duration: number; intensity: number };
  heartBreak: number;
  scoreFloat: number;
}

/** Difficulty metadata used by DIFFICULTY_CATEGORIES in constants.ts */
export interface DifficultyCategory {
  description: string;
  examples: string;
}

/** Input mapping used by CONTROLS in constants.ts */
export interface Controls {
  left: string[];
  right: string[];
  start: string[];
  konamiCode: string[];
}
