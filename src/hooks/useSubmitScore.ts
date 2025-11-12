// src/hooks/useSubmitScore.ts
'use client';

import { useState, useCallback } from 'react';

type SubmitScoreInput = {
  gameId: string;   // ✅ required by backend
  name: string;
  score: number;
  round: number;
  maxCombo: number;
};

export function useSubmitScore() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (payload: SubmitScoreInput) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/highscores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Failed to submit score (HTTP ${res.status})`);
      }

      return true; // success
    } catch (err: any) {
      console.error('[useSubmitScore] Error submitting score:', err);
      setError(err?.message ?? 'Failed to submit score');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submit, submitting, error };
}
