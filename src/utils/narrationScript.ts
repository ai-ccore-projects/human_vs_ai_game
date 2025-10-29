// src/utils/narrationScript.ts
export type NarrationLine = {
  cc: string;       // caption to display
  text: string;     // what TTS speaks
  pauseMs?: number; // optional pause after the line
};

// 1) Attract / Welcome
export const WELCOME_NARRATION: NarrationLine[] = [
  { cc: "Welcome to AI vs Human!", text: "Welcome to A.I. versus Human!" },
  { cc: "An arcade game of speed and perception.", text: "An arcade game of speed and perception.", pauseMs: 150 },
];

// 2) Name Entry / Instructions
export const INSTRUCTIONS_NARRATION: NarrationLine[] = [
  { cc: "Enter your player name to begin and select your interests", text: "Enter your player name to begin and select your interests" },
];

// 3) Gameplay Instruction (first round / screen three)
export const GAME_TIPS_NARRATION: NarrationLine[] = [
  {
    cc: "You will be shown two images. One is human-clicked and the other is AI-generated. Identify the AI image by clicking on it.",
    text: "You will see two images: one is a real human photograph and the other is AI-generated. Select the image you believe was created by AI.",
    pauseMs: 200,
  },
];

// 4) Game Over / Lost (screen four)
export const GAME_OVER_NARRATION = (score: number): NarrationLine[] => [
  {
    cc: "Game over. You lost this round.",
    text: "Game over. This round didn’t go your way.",
    pauseMs: 200,
  },
  {
    cc: "Here is your score: " + score,
    text: `Here is your score: ${score}`,
    pauseMs: 200,
  },
  {
    cc: "Try again to improve your performance.",
    text: "Don’t worry, you can always try again to beat your score.",
  },
];
