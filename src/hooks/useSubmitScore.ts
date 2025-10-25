// src/hooks/useSubmitScore.ts
'use client';

import { useState, useCallback } from 'react';

type SubmitScoreInput = {
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
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to submit score');
      return true;
    } catch (e: any) {
      setError(e?.message ?? 'Failed');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submit, submitting, error };
}
