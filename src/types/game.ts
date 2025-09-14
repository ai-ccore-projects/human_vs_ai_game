// Game Types for AI vs Human Arcade Game

export type GameScreen = 'attract' | 'nameEntry' | 'game' | 'gameOver';
export type GameResult = 'correct' | 'wrong' | null;

export interface GameImage {
  url: string;
  isAI: boolean;
  source: string;
  round: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
}

export interface GameState {
  // Game flow
  screen: GameScreen;
  isPlaying: boolean;
  isPaused: boolean;
  gameStarted: boolean;
  gameEnded: boolean;
  
  // Player data
  playerName: string;
  lives: number;
  score: number;
  highScore: number;
  
  // Game progression
  round: number;
  combo: number;
  maxCombo: number;
  timer: number;
  maxTimer: number;
  
  // Current game data
  currentImage: GameImage | null;
  correctAnswer: boolean | null;
  lastGuess: boolean | null;
  lastResult: GameResult;
  
  // Statistics
  totalGamesPlayed: number;
  totalCorrectGuesses: number;
  totalWrongGuesses: number;
  averageScore: number;
  bestRound: number;
  
  // Settings
  soundEnabled: boolean;
  fullscreenEnabled: boolean;
  debugMode: boolean;
  
  // Performance tracking
  imagesPreloaded: number;
  gameStartTime: number | null;
  lastActionTime: number | null;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  round: number;
  date: string;
  maxCombo: number;
}

export interface GameStats {
  gamesPlayed: number;
  totalCorrect: number;
  totalWrong: number;
  accuracy: number;
  averageScore: number;
  bestScore: number;
  bestRound: number;
  maxCombo: number;
}

export interface SoundEffect {
  name: string;
  buffer: AudioBuffer;
}

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

export interface DifficultyCategory {
  description: string;
  examples: string;
}

export interface Controls {
  left: string[];
  right: string[];
  start: string[];
  konamiCode: string[];
}
