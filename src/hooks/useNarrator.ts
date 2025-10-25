// src/hooks/useNarrator.ts
import { useCallback, useEffect, useRef, useState } from 'react';

type NarratorStatus = 'idle' | 'speaking' | 'paused' | 'error';

const LS_KEY = 'narrator.preferredVoiceURI';
let PREFERRED_VOICE_URI_MEMORY: string | null = null;

function resolvePreferredVoice(voices: SpeechSynthesisVoice[]) {
  const uri = PREFERRED_VOICE_URI_MEMORY || localStorage.getItem(LS_KEY) || null;
  if (!voices.length) return null;
  // 1) prefer saved URI
  if (uri) {
    const v = voices.find(v => v.voiceURI === uri) || null;
    if (v) return v;
  }
  // 2) fallbacks: pick an English voice if present, else first
  return voices.find(v => /en(-|_|$)/i.test(v.lang)) || voices[0] || null;
}

export function useNarrator() {
  const [status, setStatus] = useState<NarratorStatus>('idle');
  const [captionsOn, setCaptionsOn] = useState<boolean>(true);
  const [currentCaption, setCurrentCaption] = useState<string>('');

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Init synthesis + load voices once
  useEffect(() => {
    if (typeof window === 'undefined') return;
    synthRef.current = window.speechSynthesis;

    const assignVoice = () => {
      try {
        const voices = window.speechSynthesis.getVoices?.() || [];
        voiceRef.current = resolvePreferredVoice(voices);
      } catch {}
    };

    assignVoice();
    // Safari/Chrome: voices can load async
    window.speechSynthesis.addEventListener?.('voiceschanged', assignVoice);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', assignVoice);
    };
  }, []);

  const waitForVoices = useCallback(async (timeoutMs = 3000) => {
    if (!synthRef.current) return;
    const has = () => (window.speechSynthesis.getVoices?.() || []).length > 0;
    if (has()) return;
    await new Promise<void>((res) => {
      let done = false;
      const t = setTimeout(() => { if (!done) { done = true; res(); } }, timeoutMs);
      const onv = () => {
        if (!done) {
          done = true;
          clearTimeout(t);
          window.speechSynthesis.removeEventListener('voiceschanged', onv);
          res();
        }
      };
      window.speechSynthesis.addEventListener('voiceschanged', onv, { once: true });
    });
  }, []);

  /** Persist the voice choice (by URI) so all screens reuse it. */
  const setPreferredVoice = useCallback((voiceOrUri: SpeechSynthesisVoice | string | null) => {
    let uri = null as string | null;
    if (typeof voiceOrUri === 'string') uri = voiceOrUri;
    else if (voiceOrUri) uri = voiceOrUri.voiceURI;
    PREFERRED_VOICE_URI_MEMORY = uri;
    try {
      if (uri) localStorage.setItem(LS_KEY, uri);
      else localStorage.removeItem(LS_KEY);
    } catch {}
    // refresh current voice ref
    try {
      const voices = window.speechSynthesis.getVoices?.() || [];
      voiceRef.current = resolvePreferredVoice(voices);
    } catch {}
  }, []);

  const stop = useCallback(() => {
    try {
      synthRef.current?.cancel();
      setStatus('idle');
      setCurrentCaption('');
    } catch {}
  }, []);

  const pause = useCallback(() => {
    try {
      synthRef.current?.pause();
      setStatus('paused');
    } catch {}
  }, []);

  const resume = useCallback(() => {
    try {
      synthRef.current?.resume();
      setStatus('speaking');
    } catch {}
  }, []);

  /**
   * Speak an array of segments (or a single string). Returns a Promise that
   * resolves only after the FULL sequence has finished.
   */
  const start = useCallback(
    async (script: { text: string; caption?: string }[] | string): Promise<void> => {
      if (!synthRef.current) return;
      stop(); // clear any queued items

      await waitForVoices();

      const segments =
        typeof script === 'string' ? [{ text: script, caption: script }] : script;

      setStatus('speaking');

      for (const seg of segments) {
        const u = new SpeechSynthesisUtterance(seg.text);
        const v = voiceRef.current;
        if (v) u.voice = v;

        u.onstart = () => {
          if (captionsOn) setCurrentCaption(seg.caption ?? seg.text);
          setStatus('speaking');
        };
        u.onerror = () => setStatus('error');

        const ended = new Promise<void>((resolve) => {
          u.onend = () => {
            setStatus('idle'); // will flip to speaking again on next segment
            resolve();
          };
        });

        synthRef.current.speak(u);
        await ended;
      }

      // sequence finished
      setCurrentCaption('');
      setStatus('idle');
    },
    [captionsOn, stop, waitForVoices]
  );

  return {
    // controls
    start,
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
