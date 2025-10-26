// src/hooks/useNarrator.ts
import { useCallback, useEffect, useRef, useState } from 'react';

type NarratorStatus = 'idle' | 'speaking' | 'paused' | 'error';

const LS_KEY = 'narrator.preferredVoiceURI';
let PREFERRED_VOICE_URI_MEMORY: string | null = null;

function resolvePreferredVoice(voices: SpeechSynthesisVoice[]) {
  const uri = PREFERRED_VOICE_URI_MEMORY || (() => {
    try { return localStorage.getItem(LS_KEY); } catch { return null; }
  })() || null;

  if (!voices.length) return null;
  if (uri) {
    const v = voices.find(v => v.voiceURI === uri) || null;
    if (v) return v;
  }
  return voices.find(v => /en(-|_|$)/i.test(v.lang)) || voices[0] || null;
}

export function useNarrator() {
  const [status, setStatus] = useState<NarratorStatus>('idle');
  const [captionsOn, setCaptionsOn] = useState<boolean>(true);
  const [currentCaption, setCurrentCaption] = useState<string>('');

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Initialize speech synthesis & voice once
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

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
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    const has = () => (synth.getVoices?.() || []).length > 0;
    if (has()) return;

    await new Promise<void>((res) => {
      let done = false;
      const t = setTimeout(() => { if (!done) { done = true; res(); } }, timeoutMs);
      const onv = () => {
        if (!done) {
          done = true;
          clearTimeout(t);
          synth.removeEventListener('voiceschanged', onv);
          res();
        }
      };
      synth.addEventListener('voiceschanged', onv, { once: true });
    });
  }, []);

  /** Persist voice choice (URI) so all screens reuse it. */
  const setPreferredVoice = useCallback((voiceOrUri: SpeechSynthesisVoice | string | null) => {
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
   * Speak an array of segments (or a single string). Accepts:
   *  - string
   *  - [{ text, caption? }] 
   *  - [{ text, cc? }]   // alias supported
   */
  const start = useCallback(
    async (script: { text: string; caption?: string; cc?: string }[] | string): Promise<void> => {
      // ✅ Ensure synth is ready even if effect hasn't run yet
      if (!synthRef.current && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        synthRef.current = window.speechSynthesis;
      }
      const synth = synthRef.current;
      if (!synth) return;

      stop(); // clear any queued items

      await waitForVoices();

      // Normalize segments & support { cc } alias
      const raw = typeof script === 'string'
        ? [{ text: script, caption: script }]
        : script;

      const segments = raw.map((s: any) => ({
        text: s?.text ?? String(s),
        caption: s?.caption ?? s?.cc ?? s?.text ?? String(s),
      }));

      setStatus('speaking');

      for (const seg of segments) {
        const u = new SpeechSynthesisUtterance(seg.text);
        const v = voiceRef.current;
        if (v) u.voice = v;

        u.onstart = () => {
          if (captionsOn) setCurrentCaption(seg.caption);
          setStatus('speaking');
        };
        u.onerror = () => setStatus('error');

        const ended = new Promise<void>((resolve) => {
          u.onend = () => {
            setStatus('idle'); // will flip back to 'speaking' on next segment
            resolve();
          };
        });

        synth.speak(u);
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
