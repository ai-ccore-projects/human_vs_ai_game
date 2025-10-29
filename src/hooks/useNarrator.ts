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
      try { return localStorage.getItem(LS_KEY); } catch { return null; }
    })() ?? null;

  if (!voices.length) return null;
  if (saved) {
    const match = voices.find(v => v.voiceURI === saved) || null;
    if (match) return match;
  }
  return voices.find(v => /en(-|_|$)/i.test(v.lang)) || voices[0] || null;
}

export function useNarrator() {
  const [status, setStatus] = useState<NarratorStatus>('idle');
  const [captionsOn, setCaptionsOn] = useState<boolean>(true);
  const [currentCaption, setCurrentCaption] = useState<string>('');

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Token that invalidates any in-flight start() loops when stop() is called
  const playTokenRef = useRef(0);

  useEffect(() => {
    if (!isBrowser || !('speechSynthesis' in window)) return;

    synthRef.current = window.speechSynthesis;

    const assignVoice = () => {
      try {
        const voices = window.speechSynthesis.getVoices?.() || [];
        voiceRef.current = resolvePreferredVoice(voices);
      } catch {}
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
        if (!settled) { settled = true; resolve(); }
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

  const setPreferredVoice = useCallback((voiceOrUri: SpeechSynthesisVoice | string | null) => {
    if (!isBrowser) return;
    let uri: string | null = null;
    if (typeof voiceOrUri === 'string') uri = voiceOrUri;
    else if (voiceOrUri) uri = voiceOrUri.voiceURI;

    PREFERRED_VOICE_URI_MEMORY = uri;
    try {
      if (uri) localStorage.setItem(LS_KEY, uri);
      else localStorage.removeItem(LS_KEY);
    } catch {}

    try {
      const voices = window.speechSynthesis.getVoices?.() || [];
      voiceRef.current = resolvePreferredVoice(voices);
    } catch {}
  }, []);

  const stop = useCallback(() => {
    // Invalidate any in-flight start() loop
    playTokenRef.current += 1;
    try { synthRef.current?.cancel(); } catch {}
    setStatus('idle');
    setCurrentCaption('');
  }, []);

  const pause = useCallback(() => {
    try { synthRef.current?.pause(); setStatus('paused'); } catch {}
  }, []);

  const resume = useCallback(() => {
    try { synthRef.current?.resume(); setStatus('speaking'); } catch {}
  }, []);

  /**
   * Speak a string or NarrationLine[]. Guarantees single sequence playback.
   * If stop() is called, ongoing playback halts and this resolves early.
   */
  const start = useCallback(
    async (script: string | NarrationLine[]): Promise<void> => {
      if (!isBrowser || !('speechSynthesis' in window)) return;

      // Invalidate previous, get my token
      const myToken = ++playTokenRef.current;

      // ensure synth exists
      if (!synthRef.current) synthRef.current = window.speechSynthesis;
      const synth = synthRef.current;
      if (!synth) return;

      // clear any queued speech (safe — we already bumped token)
      try { synth.cancel(); } catch {}

      await waitForVoices();

      const lines: NarrationLine[] =
        typeof script === 'string'
          ? [{ text: script, cc: script }]
          : script.map(s => ({
              text: s.text,
              cc: (s as any).cc ?? (s as any).caption ?? s.text,
              pauseMs: s.pauseMs,
            }));

      setStatus('speaking');

      const speakOne = (text: string, cc: string | undefined) =>
        new Promise<void>((resolve) => {
          const u = new SpeechSynthesisUtterance(text);
          const v = voiceRef.current;
          if (v) u.voice = v;

          u.onstart = () => {
            if (myToken !== playTokenRef.current) { try { synth.cancel(); } catch {}; return resolve(); }
            if (captionsOn && typeof cc === 'string') setCurrentCaption(cc);
            setStatus('speaking');
          };
          u.onerror = () => {
            if (myToken !== playTokenRef.current) return resolve();
            setStatus('error');
            resolve();
          };
          u.onend = () => {
            if (myToken !== playTokenRef.current) return resolve();
            resolve();
          };

          // If token changed *before* we speak, bail
          if (myToken !== playTokenRef.current) return resolve();
          synth.speak(u);
        });

      for (const seg of lines) {
        if (myToken !== playTokenRef.current) break;
        await speakOne(seg.text, seg.cc);

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
    [captionsOn, waitForVoices]
  );

  return {
    start,
    stop,
    pause,
    resume,
    setCaptionsOn,
    setPreferredVoice,
    status,
    captionsOn,
    currentCaption,
  };
}
