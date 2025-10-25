// src/hooks/useImageManager.ts
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { sharedImageManager, GameImageManager } from '@/utils/imageManager';
import type { GameImagePair } from '@/types/game';

// Match GameImageManager.getStatus() while keeping legacy fields optional
type Status = {
  initialized: boolean;
  preloadPairQueue?: number;
  remainingImages?: number;
  leafPath?: string | null;

  // Legacy/extra fields kept optional to avoid UI breaks
  aiCache?: number;
  humanCache?: number;
  preloadQueue?: number;
  usedImages?: number;
  lexicaWorking?: boolean;
  fallbackMode?: boolean;
};

export const useImageManager = () => {
  // Use the shared singleton, wrapped in a ref to keep a stable reference
  const mgrRef = useRef<GameImageManager>(sharedImageManager);

  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({
    initialized: false,
    preloadPairQueue: 0,
    remainingImages: 0,
    leafPath: null,
  });

  // -------- Select dataset (leaf) from NameEntry screen --------
  const setLeafFolder = useCallback(async (leafPath: string) => {
    const mgr = mgrRef.current;
    try {
      await mgr.setLeafFolderPath(leafPath); // new API (has legacy alias too)
      mgr.reset(false);                       // keep dataset, clear queues
      await mgr.preloadPairs(2);              // optional: make round 1 snappy
      setStatus(mgr.getStatus() as Status);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to set dataset';
      setLoadError(msg);
    }
  }, []);

  // -------- Initialize caches right before playing --------
  const initializeImages = useCallback(async () => {
    const mgr = mgrRef.current;
    setIsLoading(true);
    setLoadError(null);
    try {
      await mgr.initializeImageCaches();
      setStatus(mgr.getStatus() as Status);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Init failed';
      setLoadError(msg);
      setStatus(mgr.getStatus() as Status);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // -------- Fetch the next AI/Human pair --------
  const loadNextPair = useCallback(
    async (round = 1): Promise<GameImagePair | null> => {
      const mgr = mgrRef.current;
      try {
        let pair = mgr.getNextPair();
        if (!pair) pair = await mgr.getNextPairAsync(round);
        if (pair) {
          setStatus(mgr.getStatus() as Status);
          return pair;
        }
        return null;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load image pair';
        setLoadError(msg);
        return null;
      }
    },
    []
  );

  // -------- Reset queues (keep selected dataset) --------
  const resetImages = useCallback(() => {
    const mgr = mgrRef.current;
    mgr.reset(false); // keep dataset leaf
    setStatus(mgr.getStatus() as Status);
  }, []);

  // -------- Rebuild availability & preload a few pairs --------
  const refreshCaches = useCallback(async () => {
    const mgr = mgrRef.current;
    setIsLoading(true);
    try {
      await mgr.refreshCaches();
      setStatus(mgr.getStatus() as Status);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to refresh';
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // -------- Keep status fresh while playing (optional) --------
  useEffect(() => {
    const mgr = mgrRef.current;
    const iv =
      status.initialized
        ? setInterval(() => setStatus(mgr.getStatus() as Status), 5000)
        : null;
    return () => {
      if (iv) clearInterval(iv);
    };
  }, [status.initialized]);

  // Ready simply mirrors manager's initialization
  const isReady = !!status.initialized;

  return {
    // derived alias for convenience (optional)
    domain: status.leafPath ?? null,

    // state
    isLoading,
    loadError,
    status,

    // actions
    setLeafFolder,
    initializeImages,
    loadNextPair,
    resetImages,
    refreshCaches,

    // computed
    isReady,
  };
};
