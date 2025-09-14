// Game Image Manager with preloading and caching

import { GameImage } from '@/types/game';
import { FREE_IMAGE_SOURCES, ULTRA_SIMPLE_IMAGES } from './constants';

interface ImageSource {
  url: string;
  isAI: boolean;
  source: string;
  metadata?: any;
}

export class GameImageManager {
  private aiImageCache: ImageSource[] = [];
  private humanImageCache: ImageSource[] = [];
  private usedImages = new Set<string>();
  private preloadQueue: GameImage[] = [];
  private initialized = false;
  private lexicaWorking = true;
  private fallbackMode = false;
  private loadingPromise: Promise<void> | null = null;

  constructor() {
    this.aiImageCache = [];
    this.humanImageCache = [];
    this.usedImages = new Set();
    this.preloadQueue = [];
    this.initialized = false;
    this.lexicaWorking = true;
    this.fallbackMode = false;
    this.loadingPromise = null;
  }

  // Initialize image caches from all sources
  async initializeImageCaches(): Promise<void> {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this.performInitialization();
    return this.loadingPromise;
  }

  private async performInitialization(): Promise<void> {
    console.log('🎮 Initializing AI vs Human Image System...');
    
    try {
      // Initialize AI images (fallback only for stability)
      await this.initializeAICache();
      
      // Initialize human image cache (Picsum is very reliable)
      await this.initializeHumanCache();
      
      console.log(`✅ Image system ready! AI: ${this.aiImageCache.length}, Human: ${this.humanImageCache.length}`);
      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize image system:', error);
      // Fallback: at least try to initialize with minimal images
      this.initializeFallbackAIImages();
      this.initializeFallbackHumanImages();
      this.initialized = true;
      console.log('🔧 Initialized with minimal fallback images');
    }
  }

  // Initialize AI image cache with fallback images only
  private async initializeAICache(): Promise<void> {
    console.log('🤖 Loading AI images...');
    
    // Use fallback images only for now (Lexica API disabled due to CORS issues)
    this.initializeFallbackAIImages();
    this.lexicaWorking = false;
    
    console.log(`🎮 AI image cache ready with ${this.aiImageCache.length} stylized images`);
  }

  // Initialize human image cache from Picsum
  private async initializeHumanCache(): Promise<void> {
    console.log('📸 Loading human photos from Picsum...');
    
    try {
      // Generate diverse human images from Picsum categories
      const categories = ['portrait', 'landscape', 'nature', 'architecture', 'street'] as const;
      
      for (const category of categories) {
        const categoryIds = FREE_IMAGE_SOURCES.human.picsum.categories[category];
        
        // Add 5 images from each category
        for (let i = 0; i < Math.min(5, categoryIds.length); i++) {
          const id = categoryIds[i];
          const imageUrl = `https://picsum.photos/id/${id}/1024/1024`;
          
          this.humanImageCache.push({
            url: imageUrl,
            isAI: false,
            source: `Picsum ${category.charAt(0).toUpperCase() + category.slice(1)}`,
            metadata: { category, id, fetchedAt: Date.now() }
          });
        }
      }

      console.log(`✅ Loaded ${this.humanImageCache.length} human photos from Picsum`);
      
    } catch (error) {
      console.error('❌ Failed to initialize human image cache:', error);
      this.initializeFallbackHumanImages();
    }
  }

  // Fallback AI images using abstract Picsum with varied effects
  private initializeFallbackAIImages(): void {
    console.log('🔄 Initializing fallback AI images...');
    
    // Create varied "AI-like" images using different effects
    const effects = [
      '?blur=2&grayscale',
      '?blur=1',
      '?grayscale',
      '?blur=3&grayscale',
      '?blur=2',
      '',  // Some normal images mixed in
    ];
    
    // Use a variety of image IDs for better diversity
    const imageIds = [
      100, 102, 104, 106, 108, 110, 112, 114, 116, 118,
      200, 202, 204, 206, 208, 210, 212, 214, 216, 218,
      300, 302, 304, 306, 308, 310, 312, 314, 316, 318,
      400, 402, 404, 406, 408, 410, 412, 414, 416, 418,
    ];
    
    for (let i = 0; i < 40; i++) {
      const imageId = imageIds[i % imageIds.length];
      const effect = effects[i % effects.length];
      const imageUrl = `https://picsum.photos/id/${imageId}/1024/1024${effect}`;
      
      this.aiImageCache.push({
        url: imageUrl,
        isAI: true,
        source: 'Stylized Picsum (AI Simulation)',
        metadata: { 
          fallback: true, 
          effect: effect || 'none',
          fetchedAt: Date.now() 
        }
      });
    }
    
    this.fallbackMode = true;
    console.log(`✅ Fallback: Generated ${this.aiImageCache.length} stylized AI images`);
  }

  // Fallback human images
  private initializeFallbackHumanImages(): void {
    console.log('🔄 Initializing fallback human images...');
    
    for (let i = 0; i < 25; i++) {
      const randomUrl = FREE_IMAGE_SOURCES.human.picsum.getRandom();
      this.humanImageCache.push({
        url: randomUrl,
        isAI: false,
        source: 'Random Picsum (Human Fallback)',
        metadata: { fallback: true, fetchedAt: Date.now() }
      });
    }
    
    console.log(`✅ Fallback: Generated ${this.humanImageCache.length} random human images`);
  }

  // Enhanced Lexica API fetching with timeout and error handling
  private async fetchImagesFromLexica(query: string, limit = 10): Promise<string[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      const response = await fetch(
        `${FREE_IMAGE_SOURCES.ai.lexica.searchUrl}?q=${encodeURIComponent(query)}`,
        { 
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'AI-vs-Human-Game/1.0'
          }
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Lexica API returned ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.images && data.images.length > 0) {
        return data.images
          .slice(0, limit)
          .map((img: any) => img.src || img.srcSmall)
          .filter((url: string) => url && url.startsWith('http'));
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`⏰ Lexica request timeout for query: ${query}`);
      } else {
        console.error(`❌ Lexica fetch failed for "${query}":`, error);
      }
    }
    return [];
  }

  // Get human photo from cache based on difficulty
  private getHumanImage(difficulty: string): ImageSource | null {
    if (this.humanImageCache.length === 0) {
      console.warn('⚠️ Human image cache is empty, using fallback');
      return {
        url: FREE_IMAGE_SOURCES.human.picsum.getRandom(),
        isAI: false,
        source: 'Picsum Fallback',
        metadata: { difficulty, fallback: true }
      };
    }

    // Filter by difficulty preference
    let candidateImages = this.humanImageCache;
    
    if (difficulty === 'easy') {
      // Prefer obvious photography categories
      candidateImages = this.humanImageCache.filter(img => 
        img.metadata?.category && ['portrait', 'landscape', 'nature'].includes(img.metadata.category)
      );
      
      if (candidateImages.length === 0) {
        candidateImages = this.humanImageCache;
      }
    }
    
    // Select random image and remove from cache
    const randomIndex = Math.floor(Math.random() * candidateImages.length);
    const selectedImage = candidateImages[randomIndex];
    
    // Remove from main cache
    const mainIndex = this.humanImageCache.indexOf(selectedImage);
    if (mainIndex > -1) {
      this.humanImageCache.splice(mainIndex, 1);
    }
    
    // Refill cache if running low
    if (this.humanImageCache.length < 10) {
      this.refillHumanCache();
    }
    
    return selectedImage;
  }

  // Get AI image from cache based on difficulty
  private getAIImage(difficulty: string): ImageSource | null {
    if (this.aiImageCache.length === 0) {
      console.warn('⚠️ AI image cache is empty, using fallback');
      return {
        url: FREE_IMAGE_SOURCES.ai.picsumAI.getAbstract(),
        isAI: true,
        source: 'Abstract Fallback',
        metadata: { difficulty, fallback: true }
      };
    }

    // For extreme difficulty, prefer Lexica images if available
    let candidateImages = this.aiImageCache;
    
    if (difficulty === 'extreme' && !this.fallbackMode) {
      candidateImages = this.aiImageCache.filter(img => 
        img.source.includes('Lexica') && !img.metadata?.fallback
      );
      
      if (candidateImages.length === 0) {
        candidateImages = this.aiImageCache;
      }
    }
    
    // Select random image and remove from cache
    const randomIndex = Math.floor(Math.random() * candidateImages.length);
    const selectedImage = candidateImages[randomIndex];
    
    // Remove from main cache
    const mainIndex = this.aiImageCache.indexOf(selectedImage);
    if (mainIndex > -1) {
      this.aiImageCache.splice(mainIndex, 1);
    }
    
    // Refill cache if running low
    if (this.aiImageCache.length < 15) {
      this.refillAICache();
    }
    
    return selectedImage;
  }

  // Refill human image cache
  private async refillHumanCache(): Promise<void> {
    console.log('🔄 Refilling human image cache...');
    
    // Add more random images from Picsum
    for (let i = 0; i < 15; i++) {
      const randomUrl = FREE_IMAGE_SOURCES.human.picsum.getRandom();
      this.humanImageCache.push({
        url: randomUrl,
        isAI: false,
        source: 'Picsum Random',
        metadata: { refill: true, fetchedAt: Date.now() }
      });
    }
  }

  // Refill AI image cache with fallback images only
  private async refillAICache(): Promise<void> {
    console.log('🔄 Refilling AI image cache with stylized images...');
    
    // Generate more fallback images with varied effects
    const effects = [
      '?blur=2&grayscale',
      '?blur=1',
      '?grayscale',
      '?blur=3&grayscale',
      '?blur=2',
      '',  // Some normal images mixed in
    ];
    
    const imageIds = [
      500, 502, 504, 506, 508, 510, 512, 514, 516, 518,
      600, 602, 604, 606, 608, 610, 612, 614, 616, 618,
    ];
    
    for (let i = 0; i < 20; i++) {
      const imageId = imageIds[i % imageIds.length];
      const effect = effects[i % effects.length];
      const imageUrl = `https://picsum.photos/id/${imageId}/1024/1024${effect}`;
      
      this.aiImageCache.push({
        url: imageUrl,
        isAI: true,
        source: 'Stylized Picsum (AI Simulation)',
        metadata: { 
          refill: true, 
          fallback: true, 
          effect: effect || 'none',
          fetchedAt: Date.now() 
        }
      });
    }
    
    console.log(`✅ Added ${20} more AI images to cache`);
  }

  // Main fetch function - gets next game image
  async fetchGameImage(round: number): Promise<GameImage> {
    // Ensure we're initialized
    if (!this.initialized) {
      await this.initializeImageCaches();
    }

    const isAI = Math.random() > 0.5;
    
    // Determine difficulty based on round
    let difficulty: 'easy' | 'medium' | 'hard' | 'extreme' = 'easy';
    if (round > 15) difficulty = 'extreme';
    else if (round > 10) difficulty = 'hard';
    else if (round > 5) difficulty = 'medium';
    
    // Get image from appropriate cache
    const imageSource = isAI 
      ? this.getAIImage(difficulty)
      : this.getHumanImage(difficulty);
    
    if (!imageSource) {
      throw new Error('Failed to get image from cache');
    }

    // Avoid duplicates by tracking used URLs
    if (this.usedImages.has(imageSource.url)) {
      console.log('🔄 Duplicate image detected, fetching another...');
      return this.fetchGameImage(round); // Recursive retry
    }
    
    this.usedImages.add(imageSource.url);
    
    return {
      url: imageSource.url,
      isAI: imageSource.isAI,
      source: imageSource.source,
      round: round,
      difficulty: difficulty
    };
  }

  // Enhanced preloading with better error handling
  async preloadImages(count = 5): Promise<void> {
    console.log(`🔄 Preloading ${count} images...`);
    
    const preloadPromises = [];
    
    for (let i = 0; i < count; i++) {
      const preloadPromise = this.preloadSingleImage(i + 1);
      preloadPromises.push(preloadPromise);
    }
    
    // Wait for all preloads to complete (or fail)
    const results = await Promise.allSettled(preloadPromises);
    
    const successful = results.filter(result => result.status === 'fulfilled').length;
    console.log(`🎮 Preloaded ${successful}/${count} images successfully`);
  }

  // Preload a single image with proper error handling
  private async preloadSingleImage(round: number): Promise<void> {
    try {
      const imageData = await this.fetchGameImage(round);

      // Create image element to trigger browser loading
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Handle CORS if needed

      return new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          console.warn(`⏰ Preload timeout for ${imageData.url}`);
          // Resolve instead of reject to keep the pipeline smooth
          resolve();
        }, 10000); // 10 second timeout per image

        let attemptedCleanUrl = false;

        img.onload = () => {
          clearTimeout(timeout);
          this.preloadQueue.push(imageData);
          console.log(`✅ Preloaded: ${imageData.source} (Round ${round})`);
          resolve();
        };

        img.onerror = () => {
          // First fallback: try same URL without query params (e.g., remove blur/grayscale)
          if (!attemptedCleanUrl && imageData.url.includes('?')) {
            attemptedCleanUrl = true;
            const cleanUrl = imageData.url.replace(/\?.*$/, '');
            console.warn(`🔄 Preload retry without effects: ${cleanUrl}`);
            img.src = cleanUrl;
            return;
          }

          clearTimeout(timeout);
          console.warn(`⚠️ Failed to preload, skipping: ${imageData.url}`);
          // Resolve (do not reject) so other images can continue loading quietly
          resolve();
        };

        img.src = imageData.url;
      });
    } catch (error) {
      console.warn(`❌ Error preloading image for round ${round}:`, error);
      // Swallow errors to avoid noisy console; caller uses allSettled
      return;
    }
  }

  // Get next preloaded image (main game method)
  getNextImage(): GameImage | null {
    // Return preloaded image if available
    if (this.preloadQueue.length > 0) {
      const image = this.preloadQueue.shift()!;
      
      // Maintain preload queue asynchronously
      if (this.preloadQueue.length < 3) {
        this.preloadImages(3).catch(error => {
          console.warn('⚠️ Background preload failed:', error);
        });
      }
      
      return image;
    }
    
    // If no preloaded images, return null (caller should handle)
    console.warn('⚠️ No preloaded images available');
    return null;
  }

  // Get next image synchronously (fallback method)
  async getNextImageAsync(round: number): Promise<GameImage> {
    // Try preloaded first
    const preloaded = this.getNextImage();
    if (preloaded) {
      return preloaded;
    }
    
    // Fallback to direct fetch
    console.log('🔄 No preloaded image, fetching directly...');
    return this.fetchGameImage(round);
  }

  // Enhanced status reporting
  getStatus(): { 
    aiCache: number; 
    humanCache: number;
    preloadQueue: number; 
    usedImages: number;
    initialized: boolean;
    lexicaWorking: boolean;
    fallbackMode: boolean;
  } {
    return {
      aiCache: this.aiImageCache.length,
      humanCache: this.humanImageCache.length,
      preloadQueue: this.preloadQueue.length,
      usedImages: this.usedImages.size,
      initialized: this.initialized,
      lexicaWorking: this.lexicaWorking,
      fallbackMode: this.fallbackMode,
    };
  }

  // Enhanced reset with cache preservation option
  reset(clearCaches = true): void {
    this.usedImages.clear();
    this.preloadQueue = [];
    
    if (clearCaches) {
      this.aiImageCache = [];
      this.humanImageCache = [];
      this.initialized = false;
      this.lexicaWorking = true;
      this.fallbackMode = false;
      console.log('🔄 Image manager fully reset');
    } else {
      console.log('🔄 Image manager reset (caches preserved)');
    }
  }

  // Force refresh of image caches
  async refreshCaches(): Promise<void> {
    console.log('🔄 Refreshing image caches...');
    this.reset(true);
    await this.initializeImageCaches();
  }

  // Get detailed cache information for debugging
  getCacheInfo(): any {
    return {
      status: this.getStatus(),
      aiSources: this.aiImageCache.map(img => ({ source: img.source, metadata: img.metadata })),
      humanSources: this.humanImageCache.map(img => ({ source: img.source, metadata: img.metadata })),
      preloadedRounds: this.preloadQueue.map(img => img.round),
      recentlyUsed: Array.from(this.usedImages).slice(-10), // Last 10 used images
    };
  }
}
