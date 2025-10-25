// src/hooks/useUniqueImages.ts
'use client';

import { useCallback, useState } from 'react';

type NextImage = {
  id: number;
  url: string;
  isAI: boolean;
};

export function useUniqueImages() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [currentImage, setCurrentImage] = useState<NextImage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetSession = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/images/session', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to create session');
      setSessionId(json.sessionId as number);
      setCurrentImage(null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create session');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadNext = useCallback(async () => {
    if (!sessionId) {
      setError('No session. Call resetSession() first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/images/next?session=${sessionId}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch next image');
      if (json.done) {
        setCurrentImage(null); // no more unique images
      } else {
        setCurrentImage({
          id: json.id,
          url: json.url,
          isAI: !!json.isAI,
        });
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to fetch next image');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  return {
    sessionId,
    currentImage,
    isLoading,
    error,
    resetSession,
    loadNext,
  };
}
