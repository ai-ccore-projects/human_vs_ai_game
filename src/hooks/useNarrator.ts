// src/hooks/useNarrator.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NarrationLine } from '@/utils/narrationScript';

type NarratorStatus = 'idle' | 'speaking' | 'paused' | 'error';

export function useNarrator() {
  const [status, setStatus] = useState<NarratorStatus>('idle');
  const [captionsOn, setCaptionsOn] = useState<boolean>(true);
  const [currentCaption, setCurrentCaption] = useState<string>('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playTokenRef = useRef(0);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const stop = useCallback(() => {
    playTokenRef.current += 1;
    const audio = audioRef.current;
    if (audio) {
      audio.onplay = null;
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.src = '';
    }
    audioRef.current = null;
    setStatus('idle');
    setCurrentCaption('');
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setStatus('paused');
    }
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
      setStatus('speaking');
    }
  }, []);

  const speakOne = useCallback(
    (id: string, _text: string, cc?: string, token?: number): Promise<void> => {
      return new Promise((resolve) => {
        if (token !== undefined && token !== playTokenRef.current) {
          return resolve();
        }

        const url = `/sounds/narration/${id}.mp3`;
        const audio = new Audio();
        audioRef.current = audio;

        const cleanup = () => {
          audio.onplay = null;
          audio.onended = null;
          audio.onerror = null;
        };

        audio.onplay = () => {
          if (token !== undefined && token !== playTokenRef.current) {
            cleanup();
            audio.pause();
            return resolve();
          }
          if (captionsOn && cc) setCurrentCaption(cc);
          setStatus('speaking');
        };

        audio.onended = () => {
          cleanup();
          resolve();
        };

        audio.onerror = () => {
          // Only log and set error if we're still the active token
          if (token === undefined || token === playTokenRef.current) {
            console.error(`[Narrator] Failed to load static audio: ${url}`);
            setStatus('error');
          }
          cleanup();
          resolve();
        };

        audio.src = url;

        // play() returns a promise; AbortError happens when we pause before it starts.
        // We swallow both AbortError and other play errors gracefully.
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err: Error) => {
            if (err.name === 'AbortError') {
              // Expected when stop() is called before play() resolves — not an error
              return;
            }
            if (token === undefined || token === playTokenRef.current) {
              console.error('[Narrator] play() failed:', err);
              setStatus('error');
            }
            resolve();
          });
        }
      });
    },
    [captionsOn]
  );

  const start = useCallback(
    async (script: string | NarrationLine[]): Promise<void> => {
      const myToken = ++playTokenRef.current;

      // Cleanly stop any previous audio without triggering onerror
      const prev = audioRef.current;
      if (prev) {
        prev.onplay = null;
        prev.onended = null;
        prev.onerror = null;
        prev.pause();
        prev.src = '';
        audioRef.current = null;
      }

      const lines: NarrationLine[] =
        typeof script === 'string'
          ? [{ id: 'dynamic', text: script, cc: script }]
          : script.map(s => ({
              id: (s as any).id || 'dynamic',
              text: s.text,
              cc: (s as any).cc ?? (s as any).caption ?? s.text,
              pauseMs: s.pauseMs,
            }));

      setStatus('speaking');

      for (const seg of lines) {
        if (myToken !== playTokenRef.current) break;
        await speakOne((seg as any).id, seg.text, seg.cc, myToken);
        if (myToken !== playTokenRef.current) break;
        if (seg.pauseMs && seg.pauseMs > 0) {
          await new Promise(r => setTimeout(r, seg.pauseMs));
        }
      }

      if (myToken === playTokenRef.current) {
        setCurrentCaption('');
        setStatus('idle');
      }
    },
    [speakOne]
  );

  return {
    start,
    stop,
    pause,
    resume,
    setCaptionsOn,
    captionsOn,
    currentCaption,
    status,
    setRate: () => {},
    setPitch: () => {},
    setVolume: () => {},
    rate: 1,
    pitch: 1,
    volume: 1,
  };
}
