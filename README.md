# 🎮 Human vs AI — Interactive Kiosk Game

A dual-screen, arcade-style interactive game where players compete to distinguish human-created art from AI-generated art. Built with **Next.js 15**, deployed on **Vercel**, synchronized via **Pusher Channels**, and narrated by **ElevenLabs AI voices**.

---

## 📖 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Directory Structure](#directory-structure)
5. [Environment Variables](#environment-variables)
6. [Installation & Running Locally](#installation--running-locally)
7. [Feature Breakdown](#feature-breakdown)
   - [Dual-Screen Architecture](#dual-screen-architecture)
   - [Game Logic](#game-logic)
   - [Audio System](#audio-system)
   - [ElevenLabs TTS & Accessibility Panel](#elevenlabs-tts--accessibility-panel)
   - [Real-Time Sync (Pusher)](#real-time-sync-pusher)
   - [Image Dataset API](#image-dataset-api)
   - [Leaderboard](#leaderboard)
8. [API Routes](#api-routes)
9. [Key Hooks](#key-hooks)
10. [Screens Reference](#screens-reference)
11. [Regenerating Audio Files](#regenerating-audio-files)
12. [Deployment](#deployment)
13. [Known Limitations & Future Work](#known-limitations--future-work)

---

## Project Overview

This is an **interactive kiosk game** designed to run in a museum or gallery setting. Two devices are used simultaneously:

- **TV / Large Display (`/display`)** — Mounts on the wall. Shows full-screen artwork, scores, timer, and narration captions. Pure visual experience. No interactive elements.
- **Touch Kiosk (`/controller`)** — A 65" touch screen that players interact with. Contains all buttons, name entry, audio narration, and game controls.

Players are shown pairs of images (one AI-generated, one human-created) and must correctly identify which is AI. The game tracks score, combo streaks, lives, and round progression.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│              TV  (/display)                     │
│  Full-screen images, score, timer, captions     │
│  Audio: NONE   Input: NONE (read-only)          │
│                                                 │
│  Subscribes to: presence-room-{code}            │
└────────────────────┬────────────────────────────┘
                     │  Pusher Channels (real-time)
┌────────────────────┴────────────────────────────┐
│          KIOSK  (/controller)                   │
│  Touch buttons, name entry, image thumbnails    │
│  Audio: ALL (music + SFX + ElevenLabs TTS)      │
│  Input: ALL                                     │
│                                                 │
│  Runs: Full Zustand game store                  │
│  Broadcasts to: presence-room-{code}            │
└─────────────────────────────────────────────────┘
```

### Pairing Flow

1. TV loads `/display` → calls `POST /api/room/create` → gets a **4-digit room code**
2. TV displays the room code and listens on `presence-room-{code}` (Pusher)
3. Kiosk loads `/controller` → player enters the room code on a touch keypad
4. Kiosk joins the same Pusher channel → TV detects the kiosk and transitions to game mode
5. All game state changes from the Kiosk are broadcast via `POST /api/room/sync`

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript |
| State Management | Zustand |
| Real-Time Sync | Pusher Channels (presence channels) |
| Database | PostgreSQL via Prisma (Prisma Accelerate) |
| TTS Narration | ElevenLabs API (pre-generated static MP3s) |
| Audio Playback | Web Audio API + HTML5 Audio |
| Animations | Framer Motion |
| Styling | Tailwind CSS + custom arcade CSS |
| Icons | Lucide React |
| Deployment | Vercel |

---

## Directory Structure

```
human_vs_ai_game/
├── public/
│   ├── sounds/
│   │   ├── background.mp3          # Ambient background music (Kevin MacLeod – Carefree)
│   │   └── narration/              # Pre-generated ElevenLabs MP3 voice clips
│   │       ├── welcome_1.mp3 – welcome_7.mp3
│   │       ├── instructions_1.mp3
│   │       ├── tips_1.mp3
│   │       ├── gameover_1.mp3 – gameover_3.mp3
│   │       └── static_attract.mp3
│   └── Video/                      # Background video loops
│
├── scripts/
│   └── generate-voice.mjs          # One-time ElevenLabs audio generation script
│
└── src/
    ├── app/
    │   ├── page.tsx                 # Original single-screen game (/)
    │   ├── controller/page.tsx      # Kiosk entry point
    │   ├── display/page.tsx         # TV display entry point
    │   └── api/
    │       ├── room/create/         # POST – Generate room code
    │       ├── room/auth/           # POST – Pusher channel auth
    │       ├── room/sync/           # POST – Broadcast game state to TV
    │       ├── tts/                 # POST – ElevenLabs TTS proxy (kept for future dynamic use)
    │       ├── images/              # GET  – Serve image pairs from dataset
    │       ├── meta/                # GET  – Artwork metadata
    │       ├── dataset/             # GET  – List available datasets
    │       └── highscores/          # GET/POST – Leaderboard
    │
    ├── components/
    │   ├── GameRouter.tsx           # Original single-screen router
    │   ├── controller/              # All Kiosk controller screens
    │   │   ├── ControllerRouter.tsx         # Main kiosk router (wrapped in NarratorProvider)
    │   │   ├── ControllerJoinScreen.tsx     # Touch keypad for room code entry
    │   │   ├── ControllerAttractScreen.tsx  # START button + welcome narration
    │   │   ├── ControllerNameEntryScreen.tsx # Name picker + arena selection
    │   │   ├── ControllerGameScreen.tsx      # Image thumbnails + guess buttons + timer
    │   │   └── ControllerGameOverScreen.tsx  # Score summary + Play Again / Main Menu
    │   ├── display/                 # All TV display screens (read-only mirrors)
    │   │   ├── DisplayRouter.tsx
    │   │   ├── DisplayWaitingScreen.tsx
    │   │   ├── DisplayAttractScreen.tsx
    │   │   ├── DisplayNameEntryScreen.tsx
    │   │   ├── DisplayGameScreen.tsx
    │   │   └── DisplayGameOverScreen.tsx
    │   ├── screens/                 # Original single-screen components (for / route)
    │   └── ui/
    │       ├── AccessibilityPanel.tsx  # Floating captions overlay (uses NarratorContext)
    │       └── InterestDropDown.tsx
    │
    ├── contexts/
    │   └── NarratorContext.tsx     # Shared React context for narrator state across all screens
    │
    ├── hooks/
    │   ├── useNarrator.ts          # ElevenLabs audio playback hook (static MP3s)
    │   ├── useSoundManager.tsx     # Web Audio API SFX + background music hook
    │   ├── useRoom.ts              # Room creation & Pusher channel management
    │   ├── useControllerSync.ts    # Broadcasts game state from Kiosk → TV
    │   ├── useDisplaySync.ts       # Receives game state from Kiosk on TV
    │   ├── useImageManager.ts      # Image loading, pair management, shuffling
    │   ├── useGameLogic.ts         # Core game mechanics (guessing, scoring, lives)
    │   ├── useHighScore.ts         # Local high score tracking
    │   ├── useSubmitScore.ts       # Submits final score to database
    │   └── useUniqueImages.ts      # Prevents duplicate image pairs
    │
    ├── stores/
    │   └── gameStore.ts            # Zustand global game state store
    │
    ├── lib/
    │   ├── pusherServer.ts         # Server-side Pusher instance
    │   └── pusherClient.ts         # Client-side Pusher singleton
    │
    ├── types/
    │   └── room.ts                 # Shared types: GameSyncPayload, SyncPair, RoomRole
    │
    └── utils/
        ├── soundManager.ts         # SoundManager class (Web Audio API)
        └── narrationScript.ts      # Static narration scripts with IDs for each line
```

---

## Environment Variables

Create a `.env.local` file in the project root. All of these are required:

```env
# =======================
# Database (Prisma)
# =======================
DATABASE_URL="postgres://..."
PRISMA_DATABASE_URL="prisma+postgres://..."

# =======================
# Pusher Channels
# =======================
NEXT_PUBLIC_PUSHER_KEY="your_pusher_app_key"
NEXT_PUBLIC_PUSHER_CLUSTER="us2"
PUSHER_APP_ID="your_pusher_app_id"
PUSHER_SECRET="your_pusher_secret"

# =======================
# ElevenLabs TTS
# =======================
ELEVENLABS_API_KEY="your_elevenlabs_api_key"
```

> **Note:** `ELEVENLABS_API_KEY` is only needed when running `generate-voice.mjs` to regenerate the static audio files. Once the MP3s exist in `public/sounds/narration/`, the application does NOT call ElevenLabs at runtime.

---

## Installation & Running Locally

```bash
# 1. Clone the repository
git clone <repo-url>
cd human_vs_ai_game

# 2. Install dependencies
npm install

# 3. Pull environment variables from Vercel (if team member)
vercel env pull .env.local

# 4. Start the development server
npm run dev
```

The application will be available at `http://localhost:3000`.

- **Kiosk (controller):** `http://localhost:3000/controller`
- **TV Display:** `http://localhost:3000/display`
- **Single-screen mode (dev/fallback):** `http://localhost:3000`

---

## Feature Breakdown

### Dual-Screen Architecture

The game is built on a **two-device architecture** communicating via Pusher Channels:

- The **Kiosk** manages all game state via a Zustand store. Every state change (screen transitions, guesses, timer ticks) is serialized and broadcast as a `game:sync` event to the TV display.
- The **TV** is a pure renderer. It listens to Pusher events and mirrors whatever the Kiosk sends. It has no game logic and no interactive elements.
- Both devices join a **Pusher Presence Channel** (`presence-room-{code}`) so each device knows when the other connects or disconnects.

---

### Game Logic

The Zustand `gameStore` manages:
- `screen` — Current screen (`attract`, `nameEntry`, `game`, `gameOver`)
- `lives` — Player lives (starts at 3, decrements on wrong guess)
- `score` — Cumulative score (100 pts base + combo bonuses)
- `combo` — Consecutive correct streaks
- `timer` / `maxTimer` — Countdown timer per round (decreases each round)
- `round` — Current round number
- `currentPair` — The two images currently shown

Scoring logic:
- **Correct guess:** `100 + (combo * 50)` points
- **Wrong guess / timeout:** Lose one life; lives hit 0 → Game Over
- **Timer:** Each round has a countdown that auto-fails if it reaches 0

---

### Audio System

The audio system consists of two layers:

#### 1. Background Music
- File: `public/sounds/background.mp3` (Kevin MacLeod – "Carefree", royalty-free)
- Played via the `SoundManager` class using the Web Audio API
- Starts when the player joins a room on the Kiosk (ensures browser autoplay policy compliance via a user interaction gate)
- Volume: 10% (`0.1`) — kept subtle for headphone users
- A **persistent Mute/Unmute toggle button** in the top status bar of the Kiosk can silence all audio at any time

#### 2. Sound Effects (SFX)
- All SFX are synthesized in real-time using the Web Audio API (`OscillatorNode` → `GainNode`)
- All waveforms use **sine waves only** (no harsh square/sawtooth) for a gentle, headphone-safe experience
- Master gain: `0.05` (very soft)
- Smooth attack/release envelopes prevent audio "popping"

#### SoundManager (`utils/soundManager.ts`)

The `SoundManager` class is a singleton that manages all audio:
```
soundManager.playMusic('backgroundMusic', volume)  // loop background music
soundManager.playSound('correct', volume)          // play a SFX
soundManager.stopAll()                             // silence everything (used by mute toggle)
soundManager.toggleSound()                        // returns new enabled/disabled state
soundManager.isEnabled()                           // check current mute state
soundManager.unlock()                              // iOS/Safari audio context unlock
```

---

### ElevenLabs TTS & Accessibility Panel

The narration system provides spoken guidance throughout the game. It is built for two purposes:
1. **Engagement** — Contextual audio instructions guide the player
2. **Accessibility** — A visible captions overlay ensures hearing-impaired users can follow along

#### Voice Generation (One-Time Setup)

The audio is **pre-generated** and stored as static MP3 files. This means:
- ElevenLabs API is called **only once**, during the generation script
- At runtime, the game plays local files — **zero recurring API cost**

To regenerate voices (e.g., if you update the narration scripts):
```bash
node --env-file=.env.local scripts/generate-voice.mjs
```

Files are saved to `public/sounds/narration/`. The script skips any file that already exists. Delete a file to force-regenerate it.

#### Voice IDs

All voices use ElevenLabs voice **Bella** (`EXAVITQu4vr4xnSDxMaL`). To change the voice, edit the `VOICE_ID` constant in `scripts/generate-voice.mjs` before running the script.

#### Narration Scripts (`utils/narrationScript.ts`)

Each line has a unique `id` that maps directly to an MP3 filename:

| ID | File | When Played |
|---|---|---|
| `static_attract` | `static_attract.mp3` | Attract screen mount |
| `welcome_1` – `welcome_7` | `welcome_N.mp3` | Original attract flow |
| `instructions_1` | `instructions_1.mp3` | Name entry screen |
| `tips_1` | `tips_1.mp3` | First round of gameplay |
| `gameover_1` – `gameover_3` | `gameover_N.mp3` | Game over screen |

#### NarratorContext (`contexts/NarratorContext.tsx`)

All controller screens share a single narrator instance via a React Context:
- `<NarratorProvider>` wraps the entire `ControllerRouter`
- Any screen calls `useNarratorContext()` to access `narrator.start()`, `narrator.stop()`, etc.
- `<AccessibilityPanel />` also reads from the same context — ensures captions always reflect what's actually playing

#### Accessibility Panel (`components/ui/AccessibilityPanel.tsx`)

Appears as a floating bottom overlay on the Kiosk whenever narration is speaking:
- Displays the current caption in large arcade font
- Shows "Voice generation by ElevenLabs" attribution
- Contains a "DISMISS / MUTE TTS" button to instantly stop narration

---

### Real-Time Sync (Pusher)

**Pusher Channels** ([pusher.com](https://pusher.com)) is used for all real-time state synchronization.

#### Key API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/room/create` | POST | Generates a 4-digit room code |
| `/api/room/auth` | POST | Pusher presence channel authentication |
| `/api/room/sync` | POST | Kiosk → TV state broadcast |

#### Event Flow

1. Kiosk changes state (e.g., player guesses correctly)
2. `useControllerSync` hook detects the state changed
3. Serializes full `GameSyncPayload` and POST to `/api/room/sync`
4. API route triggers `game:sync` event on Pusher
5. TV receives event via `useDisplaySync`, re-renders accordingly

Broadcast is debounced/deduped. Only emits when key fields (screen, score, images, etc.) actually change.

---

### Image Dataset API

Images are stored in a structured folder hierarchy on the server/Vercel file system. Players can choose an "arena" (topic/genre)  when entering their name.

| Route | Method | Purpose |
|---|---|---|
| `/api/dataset` | GET | List all available dataset categories |
| `/api/images` | GET | Load the next image pair from a dataset |
| `/api/meta` | GET | Fetch artwork metadata for the current image pair |

---

### Leaderboard

High scores are persisted to a **PostgreSQL database** via Prisma (hosted on Prisma Accelerate).

| Route | Method | Purpose |
|---|---|---|
| `/api/highscores` | GET | Fetch the top 10 leaderboard entries |
| `/api/highscores` | POST | Submit a new score |

A `<LeaderboardWidget />` component displays the top scores on the Game Over screens.

---

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/room/create` | POST | Generate a 4-digit Pusher room code |
| `/api/room/auth` | POST | Pusher presence channel auth |
| `/api/room/sync` | POST | Broadcast `GameSyncPayload` from Kiosk to TV |
| `/api/tts` | POST | ElevenLabs TTS proxy (body: `{ text, voiceId? }`) |
| `/api/dataset` | GET | List all available image dataset categories |
| `/api/images` | GET | Fetch next AI/Human image pair |
| `/api/meta` | GET | Fetch metadata for an image |
| `/api/highscores` | GET | Fetch leaderboard |
| `/api/highscores` | POST | Submit score |

---

## Key Hooks

| Hook | Purpose |
|---|---|
| `useNarrator` | Plays static ElevenLabs MP3 narration; tracks caption/status |
| `useNarratorContext` | Access the shared narrator instance (use this in controller screens) |
| `useSoundManager` | Access the `SoundManager` singleton for SFX + music |
| `useRoom` | Manages Pusher room code, channel subscription, connection status |
| `useControllerSync` | Watches Zustand state, serializes, and broadcasts to TV |
| `useDisplaySync` | Subscribes to Pusher, delivers received state to display screens |
| `useImageManager` | Fetches and manages image pairs from the dataset API |
| `useGameLogic` | Core game actions (guess, advance round, reset) |
| `useSubmitScore` | POSTs final score to the database |

---

## Screens Reference

### Controller Screens (`/controller`)

| Screen | Component | Description |
|---|---|---|
| Join | `ControllerJoinScreen` | Touch keypad for entering the 4-digit room code |
| Attract | `ControllerAttractScreen` | START button; plays welcome narration on mount |
| Name Entry | `ControllerNameEntryScreen` | Letter grid for name (max 3 chars) + arena picker |
| Game | `ControllerGameScreen` | Image thumbnails + LEFT/RIGHT guess buttons + timer |
| Game Over | `ControllerGameOverScreen` | Score summary + Play Again / Main Menu |

### Display Screens (`/display`)

| Screen | Component | Description |
|---|---|---|
| Waiting | `DisplayWaitingScreen` | Shows room code, waiting for Kiosk to connect |
| Attract | `DisplayAttractScreen` | Title + ambient animation |
| Name Entry | `DisplayNameEntryScreen` | Mirrors player name being typed |
| Game | `DisplayGameScreen` | Full-screen image pair, HUD (score/lives/timer) |
| Game Over | `DisplayGameOverScreen` | Final score, grade, leaderboard |

---

## Regenerating Audio Files

If you update the narration text in `src/utils/narrationScript.ts`, you must regenerate the audio files:

```bash
# 1. Delete the specific file(s) you want to regenerate from public/sounds/narration/
rm public/sounds/narration/welcome_1.mp3

# 2. Run the generator (skips files that already exist)
node --env-file=.env.local scripts/generate-voice.mjs
```

To add a completely new narration line:
1. Add the line with a unique `id` to `narrationScript.ts`
2. Add the same `{ id, text }` entry to `scripts/generate-voice.mjs`'s `scripts` array
3. Run the generator script
4. Import and call `narrator.start([...])` in the relevant controller screen

---

## Deployment

This project deploys to **Vercel**.

```bash
# Deploy to production
vercel --prod
```

Ensure all environment variables from the [Environment Variables](#environment-variables) section are configured in your Vercel project settings.

The Pusher free tier allows **200,000 messages/day** and **100 concurrent connections** — more than sufficient for a single kiosk installation.

---

## Known Limitations & Future Work

| Area | Note |
|---|---|
| **Audio Mute Persistence** | The mute state is stored only in React component state, so it resets if the page refreshes. For a persistent mute, store the state in `localStorage`. |
| **Room Codes** | Room codes are not stored server-side. If both devices disconnect, a new code must be generated by reloading the TV. |
| **Dynamic Score Narration** | The Gme Over narration says "Check your final score on the screen" rather than reading the actual score. If dynamic scores in narration are desired, the `/api/tts` endpoint is already set up for on-the-fly generation. |
| **Image Dataset** | The image dataset must be uploaded and organized in a specific folder structure on the server. Reach out to the original developer for dataset format documentation. |
| **Single Kiosk** | The current architecture assumes one Kiosk + one TV per event. Running multiple rooms simultaneously would work on Pusher's free tier but has not been tested. |
