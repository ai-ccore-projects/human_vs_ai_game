// src/hooks/useHighScores.ts
'use client';

import { useEffect, useState } from 'react';

type ScoreItem = {
  name: string;
  score: number;
  round: number;
  maxCombo: number;
  createdAt: number;
};

export function useHighScores(limit = 10) {
  const [items, setItems] = useState<ScoreItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/highscores?limit=${limit}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch scores');
        if (mounted) setItems(json.items || []);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? 'Failed');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [limit]);

  return { items, loading, error };
}
