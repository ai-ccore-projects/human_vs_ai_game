import fs from 'fs';
import path from 'path';
import 'dotenv/config'; // loads .env.local

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Bella

// Define the precise static script we just created in narrationScript.ts
const scripts = [
  // WELCOME
  { id: 'welcome_1', text: "Welcome to A.I. versus Human!" },
  { id: 'welcome_2', text: "An arcade game of speed and perception." },
  { id: 'welcome_3', text: "An art collector is searching for rare masterpieces to add to his collection." },
  { id: 'welcome_4', text: "He needs your help to identify which artworks are real and which are AI-generated." },
  { id: 'welcome_5', text: "Each wrong guess costs him money as compensation to the gallery." },
  { id: 'welcome_6', text: "Choose wisely and guide him through each gallery!" },
  { id: 'welcome_7', text: "Let’s begin your journey through the first gallery!" },
  // INSTRUCTIONS
  { id: 'instructions_1', text: "Enter your player name to begin and select your interests" },
  // TIPS
  { id: 'tips_1', text: "You will see two images: one is a real human photograph and the other is AI-generated. Select the image you believe was created by AI." },
  // GAME OVER
  { id: 'gameover_1', text: "You lost this round." },
  { id: 'gameover_2', text: "Check your final score on the screen." },
  { id: 'gameover_3', text: "Try again to improve your performance." },
  // STATIC ATTRACT WELCOME
  { id: 'static_attract', text: "Welcome to Human versus A I! Tap the Start button below to begin your evaluation." },
];

const OUT_DIR = path.resolve('public', 'sounds', 'narration');

async function generateAll() {
  if (!ELEVENLABS_API_KEY) {
    console.error("FATAL: ELEVENLABS_API_KEY is not set in .env.local");
    process.exit(1);
  }

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  console.log(`Generating ${scripts.length} voice lines to ${OUT_DIR}...`);

  for (const line of scripts) {
    const filePath = path.join(OUT_DIR, `${line.id}.mp3`);
    if (fs.existsSync(filePath)) {
      console.log(`[SKIPPING] ${line.id}.mp3 already exists.`);
      continue;
    }

    console.log(`[GENERATING] ${line.id}.mp3...`);

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: line.text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!res.ok) {
      console.error(`Failed to generate ${line.id}:`, await res.text());
      continue;
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);
    console.log(`-> Saved ${line.id}.mp3`);
  }

  console.log('All done!');
}

generateAll().catch(console.error);
