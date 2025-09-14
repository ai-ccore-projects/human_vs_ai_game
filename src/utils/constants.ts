// Game Constants and Configuration

import { AnimationConfig, DifficultyCategory, Controls } from '@/types/game';

export const GAME_CONFIG = {
  INITIAL_LIVES: 2,
  INITIAL_TIME: 15, // seconds
  TIME_DECREASE_RATE: 0.5, // seconds to decrease per round
  MIN_TIME: 5, // minimum time per round
  PRELOAD_COUNT: 5,
  MAX_COMBO: 10,
  COMBO_MULTIPLIER: 1.5,
} as const;

export const POINTS = {
  CORRECT_ANSWER: 100,
  COMBO_BONUS: 50,
  TIME_BONUS_MULTIPLIER: 10, // points per second remaining
} as const;

export const ANIMATION_CONFIG: AnimationConfig = {
  screenTransition: 600,
  buttonHover: 200,
  correctAnswer: 400,
  wrongAnswer: 800,
  particleDuration: 2000,
  screenShake: { duration: 500, intensity: 10 },
  heartBreak: 600,
  scoreFloat: 1200,
};

export const DIFFICULTY_CATEGORIES: Record<string, DifficultyCategory> = {
  easy: {
    description: "Clear AI artifacts or obvious photography",
    examples: "6-finger hands, impossible physics, golden hour photos"
  },
  medium: {
    description: "Subtle differences, good AI or filtered photos", 
    examples: "Stylized art, edited photos, consistent AI generations"
  },
  hard: {
    description: "Nearly indistinguishable",
    examples: "Photorealistic AI, artistic photography, abstract images"
  },
  extreme: {
    description: "Expert level - even pros struggle",
    examples: "Latest AI models, professional photography, mixed media"
  }
};

export const CONTROLS: Controls = {
  left: ['ArrowLeft', 'a', 'A', '1'],
  right: ['ArrowRight', 'd', 'D', '2'],
  start: ['Enter', ' '],
  konamiCode: ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']
};

export const ARCADE_COLORS = {
  primary: '#00FFF0', // Cyan
  secondary: '#FF10F0', // Magenta
  accent: '#39FF14', // Neon Green
  warning: '#FF6B35', // Orange
  error: '#FF073A', // Red
  bg: '#0A0A0F', // Dark Purple
  surface: '#1A1A2E', // Dark Blue
} as const;

const picsumCategories = {
  portrait: [1011, 1012, 1013, 1014, 1015, 1025, 1027],
  landscape: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
  nature: [28, 29, 30, 31, 32, 33, 34, 35, 36, 37],
  architecture: [48, 49, 50, 51, 52, 53, 54, 55, 56, 57],
  street: [64, 65, 66, 67, 68, 69, 70, 71, 72, 73]
} as const;

export const FREE_IMAGE_SOURCES = {
  human: {
    picsum: {
      random: 'https://picsum.photos/1024/1024',
      getRandom: () => `https://picsum.photos/1024/1024?random=${Date.now()}`,
      
      categories: picsumCategories,
      
      getCategory: (category: keyof typeof picsumCategories) => {
        const ids = picsumCategories[category];
        const id = ids[Math.floor(Math.random() * ids.length)];
        return `https://picsum.photos/id/${id}/1024/1024`;
      }
    }
  },

  ai: {
    lexica: {
      searchUrl: 'https://lexica.art/api/v1/search',
      queries: [
        'stable diffusion art',
        'midjourney artwork',
        'ai generated portrait',
        'digital painting fantasy',
        'cyberpunk aesthetic',
        'surreal digital art',
        'neural network art',
        '3d render artwork',
        'synthwave aesthetic',
        'algorithmic generative'
      ]
    },
    
    picsumAI: {
      abstractIds: [100, 102, 104, 106, 108, 110, 112, 114, 116, 118, 200, 202, 204, 206, 208],
      getAbstract: () => {
        const id = FREE_IMAGE_SOURCES.ai.picsumAI.abstractIds[
          Math.floor(Math.random() * FREE_IMAGE_SOURCES.ai.picsumAI.abstractIds.length)
        ];
        const effects = ['?blur=2&grayscale', '?blur=1', '?grayscale', '?blur=3'];
        const effect = effects[Math.floor(Math.random() * effects.length)];
        return `https://picsum.photos/id/${id}/1024/1024${effect}`;
      }
    }
  }
};

export const ULTRA_SIMPLE_IMAGES = {
  human: () => `https://picsum.photos/1024/1024?random=${Date.now()}`,
  ai: () => `https://picsum.photos/1024/1024?blur=3&grayscale&random=${Date.now()}`
};
