// src/types/room.ts
// Shared types for the dual-screen room protocol

import type { GameScreen, Difficulty } from './game';

/** Role a browser tab plays in a room */
export type RoomRole = 'display' | 'controller';

/** Minimal image data broadcasted to the TV */
export interface SyncImage {
  url: string;
  isAI: boolean;
}

/** The image pair shown on TV */
export interface SyncPair {
  images: [SyncImage, SyncImage];
  aiIndex: 0 | 1;
  round: number;
  difficulty: Difficulty;
}

/** Full game state snapshot sent from kiosk → TV */
export interface GameSyncPayload {
  // Screen & lifecycle
  screen: GameScreen;
  isPlaying: boolean;
  isPaused: boolean;
  gameEnded: boolean;

  // Player & score
  playerName: string;
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

  // Current pair (null when loading)
  currentPair: SyncPair | null;

  // Result feedback
  lastResult: 'correct' | 'wrong' | null;
  feedbackMessage: string | null;
  showResult: boolean;
  showMeta: boolean;
  metaText: string | null;
  canGoNext: boolean;

  // Narration captions (so TV can display them)
  narratorCaption: string;
  narratorStatus: string;

  // Stats for game-over screen
  accuracy: number;
  totalCorrectGuesses: number;
  totalWrongGuesses: number;

  // Selected arena
  leafPath: string | null;

  // Leaderboard data (for TV game-over display)
  leaderboard: Array<{
    name: string;
    score: number;
    round: number;
    maxCombo: number;
    createdAt: number;
  }>;
}

/** Room connection status */
export type RoomConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

/** Room state tracked on both sides */
export interface RoomState {
  roomCode: string | null;
  role: RoomRole;
  connectionStatus: RoomConnectionStatus;
  controllerConnected: boolean;
  displayConnected: boolean;
}
