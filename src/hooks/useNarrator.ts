// src/hooks/useNarrator.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NarrationLine } from '@/utils/narrationScript';

type NarratorStatus = 'idle' | 'speaking' | 'paused' | 'error';

const isBrowser = typeof window !== 'undefined';
const LS_KEY = 'narrator.preferredVoiceURI';
let PREFERRED_VOICE_URI_MEMORY: string | null = null;

function resolvePreferredVoice(voices: SpeechSynthesisVoice[]) {
  const saved =
    PREFERRED_VOICE_URI_MEMORY ??
    ((): string | null => {
      try {
        return localStorage.getItem(LS_KEY);
      } catch {
        return null;
      }
    })() ??
    null;

  if (!voices.length) return null;
  if (saved) {
    const match = voices.find(v => v.voiceURI === saved) || null;
    if (match) return match;
  }
  // pick any English-like voice, else first
  return voices.find(v => /en(-|_|$)/i.test(v.lang)) || voices[0] || null;
}

export function useNarrator() {
  const [status, setStatus] = useState<NarratorStatus>('idle');
  const [captionsOn, setCaptionsOn] = useState<boolean>(true);
  const [currentCaption, setCurrentCaption] = useState<string>('');

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // init synth and voice (client-only)
  useEffect(() => {
    if (!isBrowser || !('speechSynthesis' in window)) return;

    synthRef.current = window.speechSynthesis;

    const assignVoice = () => {
      try {
        const voices = window.speechSynthesis.getVoices?.() || [];
        voiceRef.current = resolvePreferredVoice(voices);
      } catch {
        /* ignore */
      }
    };

    assignVoice();
    window.speechSynthesis.addEventListener?.('voiceschanged', assignVoice);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', assignVoice);
    };
  }, []);

  const waitForVoices = useCallback(async (timeoutMs = 3000) => {
    if (!isBrowser || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    const have = () => (synth.getVoices?.() || []).length > 0;
    if (have()) return;

    await new Promise<void>((resolve) => {
      let settled = false;
      const t = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve();
        }
      }, timeoutMs);
      const handler = () => {
        if (!settled) {
          settled = true;
          clearTimeout(t);
          synth.removeEventListener('voiceschanged', handler);
          resolve();
        }
      };
      synth.addEventListener('voiceschanged', handler, { once: true } as any);
    });
  }, []);

  /** Persist a preferred voice (by object or URI). */
  const setPreferredVoice = useCallback((voiceOrUri: SpeechSynthesisVoice | string | null) => {
    if (!isBrowser) return;
    let uri: string | null = null;
    if (typeof voiceOrUri === 'string') uri = voiceOrUri;
    else if (voiceOrUri) uri = voiceOrUri.voiceURI;

    PREFERRED_VOICE_URI_MEMORY = uri;
    try {
      if (uri) localStorage.setItem(LS_KEY, uri);
      else localStorage.removeItem(LS_KEY);
    } catch {
      /* ignore */
    }

    try {
      const voices = window.speechSynthesis.getVoices?.() || [];
      voiceRef.current = resolvePreferredVoice(voices);
    } catch {
      /* ignore */
    }
  }, []);

  const stop = useCallback(() => {
    try {
      synthRef.current?.cancel();
    } catch {
      /* ignore */
    } finally {
      setStatus('idle');
      setCurrentCaption('');
    }
  }, []);

  const pause = useCallback(() => {
    try {
      synthRef.current?.pause();
      setStatus('paused');
    } catch {
      /* ignore */
    }
  }, []);

  const resume = useCallback(() => {
    try {
      synthRef.current?.resume();
      setStatus('speaking');
    } catch {
      /* ignore */
    }
  }, []);

  /**
   * Speak either a string or a sequence of NarrationLine (supports cc + pauseMs).
   * Resolves when the *entire* sequence (including pauses) finishes.
   */
  const start = useCallback(
    async (script: string | NarrationLine[]): Promise<void> => {
      if (!isBrowser || !('speechSynthesis' in window)) return;

      // ensure synth exists (in case effect hasn't run yet)
      if (!synthRef.current) synthRef.current = window.speechSynthesis;
      const synth = synthRef.current;
      if (!synth) return;

      // Clear any queued speech first
      stop();

      await waitForVoices();

      // Normalize into an array of NarrationLine
      const lines: NarrationLine[] =
        typeof script === 'string'
          ? [{ text: script, cc: script }]
          : script.map(s => ({
              text: s.text,
              cc: s.cc ?? (s as any).caption ?? s.text,
              pauseMs: s.pauseMs,
            }));

      setStatus('speaking');

      for (let i = 0; i < lines.length; i++) {
        const seg = lines[i];

        const u = new SpeechSynthesisUtterance(seg.text);
        const v = voiceRef.current;
        if (v) u.voice = v;

        // events for this utterance
        const ended = new Promise<void>((resolve) => {
          u.onstart = () => {
            if (captionsOn) setCurrentCaption(seg.cc);
            setStatus('speaking');
          };
          u.onerror = () => {
            setStatus('error');
            resolve();
          };
          u.onend = () => {
            resolve();
          };
        });

        synth.speak(u);
        await ended;

        // optional pause after this line
        if (seg.pauseMs && seg.pauseMs > 0) {
          await new Promise(r => setTimeout(r, seg.pauseMs));
        }
      }

      // sequence finished
      setCurrentCaption('');
      setStatus('idle');
    },
    [captionsOn, stop, waitForVoices]
  );

  return {
    // controls
    start,       // accepts string | NarrationLine[]
    stop,
    pause,
    resume,
    setCaptionsOn,
    setPreferredVoice,

    // state
    status,
    captionsOn,
    currentCaption,
  };
}
