import { useEffect, useRef, useCallback, useState } from 'react';
import { GameImageManager } from '@/utils/imageManager';
import { useGameWithLeaderboard } from '@/stores/gameStore';
import { GameImage } from '@/types/game';

/**
 * Hook to manage the game's image fetching and preloading system
 * Integrates the ImageManager with the game store
 */
export const useImageManager = () => {
  const gameStore = useGameWithLeaderboard();
  const imageManagerRef = useRef<GameImageManager | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [imageManagerStatus, setImageManagerStatus] = useState({
    aiCache: 0,
    humanCache: 0,
    preloadQueue: 0,
    usedImages: 0,
    initialized: false,
    lexicaWorking: false,
    fallbackMode: false,
  });

  // Initialize ImageManager
  useEffect(() => {
    if (!imageManagerRef.current) {
      imageManagerRef.current = new GameImageManager();
      console.log('🎮 ImageManager created');
    }
  }, []);

  // Initialize image caches when game starts
  const initializeImages = useCallback(async () => {
    if (!imageManagerRef.current) return;

    setIsLoading(true);
    setLoadError(null);

    try {
      console.log('🎮 Initializing image system...');
      await imageManagerRef.current.initializeImageCaches();
      
      // Preload first batch of images
      try {
        await imageManagerRef.current.preloadImages(5);
      } catch (preloadError) {
        console.warn('⚠️ Preload failed, but continuing:', preloadError);
        // Continue even if preload fails
      }
      
      // Update status
      const status = imageManagerRef.current.getStatus();
      setImageManagerStatus(status);
      
      console.log('✅ Image system ready!', status);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to initialize images:', error);
      setLoadError(errorMessage);
      
      // Try to get status even after error
      if (imageManagerRef.current) {
        const status = imageManagerRef.current.getStatus();
        setImageManagerStatus(status);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load next image for the game
  const loadNextImage = useCallback(async () => {
    if (!imageManagerRef.current || !gameStore.isPlaying) return;

    try {
      // Try to get preloaded image first
      let gameImage = imageManagerRef.current.getNextImage();
      
      // If no preloaded image, fetch directly
      if (!gameImage) {
        console.log('🔄 No preloaded image, fetching for round', gameStore.round);
        gameImage = await imageManagerRef.current.getNextImageAsync(gameStore.round);
      }

      if (gameImage) {
        // Update game store with new image
        gameStore.setCurrentImage(gameImage);
        
        // Update status
        const status = imageManagerRef.current.getStatus();
        setImageManagerStatus(status);
        
        console.log(`🎮 Loaded image for round ${gameStore.round}:`, {
          source: gameImage.source,
          isAI: gameImage.isAI,
          difficulty: gameImage.difficulty
        });
      }
      
    } catch (error) {
      console.error('❌ Failed to load next image:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to load image');
    }
  }, [gameStore]);

  // Reset image manager for new game
  const resetImages = useCallback(() => {
    if (!imageManagerRef.current) return;
    
    imageManagerRef.current.reset(false); // Keep caches, just clear used images
    const status = imageManagerRef.current.getStatus();
    setImageManagerStatus(status);
    
    console.log('🔄 Image manager reset for new game');
  }, []);

  // Refresh all caches (for debugging or if sources fail)
  const refreshCaches = useCallback(async () => {
    if (!imageManagerRef.current) return;

    setIsLoading(true);
    try {
      await imageManagerRef.current.refreshCaches();
      const status = imageManagerRef.current.getStatus();
      setImageManagerStatus(status);
      console.log('✅ Image caches refreshed');
    } catch (error) {
      console.error('❌ Failed to refresh caches:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to refresh');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get detailed cache information
  const getCacheInfo = useCallback(() => {
    if (!imageManagerRef.current) return null;
    return imageManagerRef.current.getCacheInfo();
  }, []);

  // Update status periodically
  useEffect(() => {
    if (!imageManagerRef.current) return;

    const updateStatus = () => {
      if (imageManagerRef.current) {
        const status = imageManagerRef.current.getStatus();
        setImageManagerStatus(status);
      }
    };

    // Update status every 5 seconds during gameplay
    const interval = gameStore.isPlaying 
      ? setInterval(updateStatus, 5000)
      : null;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameStore.isPlaying]);

  // Auto-load next image when game progresses
  useEffect(() => {
    if (gameStore.isPlaying && !gameStore.currentImage) {
      loadNextImage();
    }
  }, [gameStore.isPlaying, gameStore.round, loadNextImage]);

  return {
    // State
    isLoading,
    loadError,
    imageManagerStatus,
    
    // Actions
    initializeImages,
    loadNextImage,
    resetImages,
    refreshCaches,
    getCacheInfo,
    
    // Computed values
    isReady: imageManagerStatus.initialized && imageManagerStatus.preloadQueue > 0,
    hasError: !!loadError,
    cacheHealth: {
      aiImages: imageManagerStatus.aiCache > 10,
      humanImages: imageManagerStatus.humanCache > 10,
      preloaded: imageManagerStatus.preloadQueue > 2,
    },
  };
};

/**
 * Hook for debugging image manager status
 */
export const useImageManagerDebug = () => {
  const { getCacheInfo, imageManagerStatus, refreshCaches } = useImageManager();
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const updateDebugInfo = useCallback(() => {
    const info = getCacheInfo();
    setDebugInfo(info);
  }, [getCacheInfo]);

  useEffect(() => {
    updateDebugInfo();
  }, [imageManagerStatus, updateDebugInfo]);

  return {
    debugInfo,
    imageManagerStatus,
    updateDebugInfo,
    refreshCaches,
  };
};
