// src/utils/imageManager.ts
import type { GameImage, GameImagePair, Difficulty } from '@/types/game';

type DatasetInfo = {
  folders: string[];
  files?: {
    ai_generated?: string[];
    human?: string[];
  };
  path?: string;
  publicBaseUrl?: string;
};

export class GameImageManager {
  // Selected dataset leaf, e.g. "classic_paintings/oil_on_canvas"
  private baseLeafPath: string | null = null;

  private initialized = false;
  private preloadPairQueue: GameImagePair[] = [];

  // Numbers (file stems) that exist on BOTH sides
  private availableNumbers: number[] = [];

  // Track the real extension per number (AI: png; Human: jpg|jpeg)
  private aiExtByNum: Record<number, 'png'> = {};
  private humanExtByNum: Record<number, 'jpg' | 'jpeg'> = {};

  constructor() {
    this.reset(true);
  }

  // ========= Public API (used by hooks/screens) =========

  /**
   * ✅ Legacy alias so old code calling setLocalDataset(...) keeps working.
   * Internally delegates to setLeafFolderPath(...)
   */
  setLocalDataset(leafPath: string) {
    return this.setLeafFolderPath(leafPath);
  }

  /**
   * Must be called after the player selects an arena (leaf folder).
   * Example: setLeafFolderPath("classic_paintings/oil_on_canvas")
   */
  async setLeafFolderPath(leafPath: string) {
    this.baseLeafPath = leafPath.replace(/^\/+|\/+$/g, '');
    this.preloadPairQueue = [];
    this.availableNumbers = [];
    this.aiExtByNum = {};
    this.humanExtByNum = {};

    // Read actual files so we don't guess extensions or counts
    const res = await fetch(`/api/dataset?path=${encodeURIComponent(this.baseLeafPath)}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Failed to read dataset at ${this.baseLeafPath}`);
    }
    const data = (await res.json()) as DatasetInfo;

    const aiList = data.files?.ai_generated ?? [];
    const humanList = data.files?.human ?? [];

    // Pull numeric stem + extension
    const numFrom = (name: string) => {
      const m = name.match(/^(\d+)\.(png|jpg|jpeg)$/i);
      return m ? { n: Number(m[1]), ext: m[2].toLowerCase() as 'png' | 'jpg' | 'jpeg' } : null;
    };

    const aiNums = new Set<number>();
    for (const f of aiList) {
      const p = numFrom(f);
      // Your dataset uses .png on AI side
      if (p && p.ext === 'png') {
        aiNums.add(p.n);
        this.aiExtByNum[p.n] = 'png';
      }
    }

    const humanNums = new Set<number>();
    for (const f of humanList) {
      const p = numFrom(f);
      // Accept jpg or jpeg on human side
      if (p && (p.ext === 'jpg' || p.ext === 'jpeg')) {
        humanNums.add(p.n);
        this.humanExtByNum[p.n] = p.ext;
      }
    }

    // Intersection only: numbers that exist on both sides
    const both: number[] = [];
    aiNums.forEach((n) => {
      if (humanNums.has(n)) both.push(n);
    });

    if (both.length === 0) {
      throw new Error('Selected dataset has no matching numbered pairs.');
    }

    // Shuffle for variety
    this.availableNumbers = this.shuffle(both.slice());

    // Mark initialized (caches are logical, not heavy network caches)
    this.initialized = true;

    console.log(
      `📂 Dataset ready: ${this.baseLeafPath} — ${this.availableNumbers.length} pairs available.`,
    );
  }

  async initializeImageCaches() {
    // No heavy caches now; just ensure a dataset was selected.
    if (!this.baseLeafPath) {
      throw new Error('No dataset selected. Call setLeafFolderPath() first.');
    }
    this.initialized = true;
  }

  async preloadPairs(count: number) {
    // Simple preload: generate a few pairs ahead of time
    for (let i = 0; i < count; i++) {
      const pair = await this.getNextPairAsync(i + 1);
      if (pair) this.preloadPairQueue.push(pair);
      else break;
    }
  }

  getNextPair(): GameImagePair | null {
    return this.preloadPairQueue.shift() ?? null;
  }

  async getNextPairAsync(round: number): Promise<GameImagePair | null> {
    if (!this.baseLeafPath) return null;

    // If exhausted, reshuffle what's available again (or re-derive from leaf)
    if (this.availableNumbers.length === 0) {
      // Re-read the same leaf to rebuild the list (handles if files changed)
      await this.setLeafFolderPath(this.baseLeafPath);
    }

    const n = this.availableNumbers.shift();
    if (typeof n !== 'number') return null;

    const difficulty = this.getDifficultyForRound(round);

    const aiImg: GameImage = {
      id: `ai-${n}-${round}`,
      url: this.buildUrl('ai_generated', n, this.aiExtByNum[n] || 'png'),
      isAI: true,
      source: 'local',
      round,
      difficulty,
    };

    const humanExt = this.humanExtByNum[n] || 'jpg';
    const humanImg: GameImage = {
      id: `human-${n}-${round}`,
      url: this.buildUrl('human', n, humanExt),
      isAI: false,
      source: 'local',
      round,
      difficulty,
    };

    const aiIndex: 0 | 1 = Math.random() < 0.5 ? 0 : 1;
    const images: [GameImage, GameImage] =
      aiIndex === 0 ? [aiImg, humanImg] : [humanImg, aiImg];

    // Match your GameImagePair type (no 'id' field)
    const pair: GameImagePair = {
      ai: aiImg,
      human: humanImg,
      round,
      difficulty,
      aiIndex,
      images,
    };

    return pair;
  }

  async refreshCaches() {
    // Keep the selected leaf, but rebuild availability and clear queues
    const leaf = this.baseLeafPath;
    this.preloadPairQueue = [];
    this.availableNumbers = [];
    this.aiExtByNum = {};
    this.humanExtByNum = {};
    this.initialized = false;

    if (leaf) {
      await this.setLeafFolderPath(leaf);
      await this.preloadPairs(5);
    }
  }

  /**
   * reset(false) — keep dataset leaf, clear queues
   * reset(true)  — clear everything including selected leaf
   */
  reset(hard = false) {
    if (hard) this.baseLeafPath = null;
    this.preloadPairQueue = [];
    this.availableNumbers = [];
    this.aiExtByNum = {};
    this.humanExtByNum = {};
    this.initialized = false;
  }

  getStatus() {
    return {
      initialized: this.initialized,
      preloadPairQueue: this.preloadPairQueue.length,
      remainingImages: this.availableNumbers.length,
      leafPath: this.baseLeafPath,
    };
  }

  // ========= Internals =========

  private getDifficultyForRound(round: number): Difficulty {
    if (round <= 3) return 'easy';
    if (round <= 6) return 'medium';
    if (round <= 9) return 'hard';
    return 'extreme';
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Build a URL under /public/data_set/... and safely encode each segment.
   * Example:
   * /data_set/classic_paintings/oil_on_canvas/ai_generated/1.png
   */
  private buildUrl(
    segment: 'ai_generated' | 'human',
    n: number,
    ext: 'png' | 'jpg' | 'jpeg',
  ): string {
    const leaf = this.baseLeafPath ?? '';
    const parts = ['data_set', ...leaf.split('/'), segment, `${n}.${ext}`].map(encodeURIComponent);
    return '/' + parts.join('/');
  }
}

// ✅ Export a singleton so all screens share the same manager
export const sharedImageManager = new GameImageManager();
