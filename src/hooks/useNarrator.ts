// src/hooks/useNarrator.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NarrationLine } from '@/utils/narrationScript';

type NarratorStatus = 'idle' | 'speaking' | 'paused' | 'error';

const isBrowser = typeof window !== 'undefined';

// ✅ Change this to the exact name of the voice you want to lock in
const FIXED_VOICE_NAME = 'Google US English'; // e.g. 'Samantha', 'Microsoft Aria', etc.

export function useNarrator() {
  const [status, setStatus] = useState<NarratorStatus>('idle');
  const [captionsOn, setCaptionsOn] = useState<boolean>(true);
  const [currentCaption, setCurrentCaption] = useState<string>('');

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // playback settings
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [volume, setVolume] = useState(1.0);

  // Token that invalidates any in-flight start() loops when stop() is called
  const playTokenRef = useRef(0);

  useEffect(() => {
    if (!isBrowser || !('speechSynthesis' in window)) return;

    synthRef.current = window.speechSynthesis;

    const assignVoice = () => {
      try {
        const voices = window.speechSynthesis.getVoices?.() || [];
        // 🎯 Force one fixed voice by name
        const fixedVoice =
          voices.find(v => v.name === FIXED_VOICE_NAME) ||
          voices.find(v => v.name.includes(FIXED_VOICE_NAME)) ||
          voices[0] ||
          null;

        voiceRef.current = fixedVoice;
        console.log('[Narrator] Using fixed voice:', fixedVoice?.name || 'Default');
      } catch (err) {
        console.error('Voice assignment failed', err);
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

  const stop = useCallback(() => {
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

  const start = useCallback(
    async (script: string | NarrationLine[]): Promise<void> => {
      if (!isBrowser || !('speechSynthesis' in window)) return;

      const myToken = ++playTokenRef.current;
      if (!synthRef.current) synthRef.current = window.speechSynthesis;
      const synth = synthRef.current;
      if (!synth) return;

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

      const speakOne = (text: string, cc?: string) =>
        new Promise<void>((resolve) => {
          const utterance = new SpeechSynthesisUtterance(text);
          if (voiceRef.current) utterance.voice = voiceRef.current;
          utterance.rate = rate;
          utterance.pitch = pitch;
          utterance.volume = volume;

          utterance.onstart = () => {
            if (myToken !== playTokenRef.current) { try { synth.cancel(); } catch {}; return resolve(); }
            if (captionsOn && cc) setCurrentCaption(cc);
            setStatus('speaking');
          };
          utterance.onerror = () => {
            if (myToken !== playTokenRef.current) return resolve();
            setStatus('error');
            resolve();
          };
          utterance.onend = () => {
            if (myToken !== playTokenRef.current) return resolve();
            resolve();
          };

          if (myToken !== playTokenRef.current) return resolve();
          synth.speak(utterance);
        });

      for (const seg of lines) {
        if (myToken !== playTokenRef.current) break;
        await speakOne(seg.text, seg.cc);
        if (myToken !== playTokenRef.current) break;
        if (seg.pauseMs && seg.pauseMs > 0) await new Promise(r => setTimeout(r, seg.pauseMs));
      }

      if (myToken === playTokenRef.current) {
        setCurrentCaption('');
        setStatus('idle');
      }
    },
    [captionsOn, waitForVoices, rate, pitch, volume]
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
    setRate,
    setPitch,
    setVolume,
    rate,
    pitch,
    volume,
  };
}
