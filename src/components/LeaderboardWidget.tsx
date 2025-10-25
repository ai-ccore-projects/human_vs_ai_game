// src/components/LeaderboardWidget.tsx
'use client';

import React from 'react';
import { useHighScores } from '@/hooks/useHighScore';

type Props = { limit?: number; className?: string };

type ScoreItem = {
  name: string;
  score: number;
  round: number;
  maxCombo: number;
  createdAt: number;
};

export default function LeaderboardWidget({ limit = 10, className }: Props) {
  const { items, loading, error } = useHighScores(limit);

  return (
    <div className={`arcade-border rounded-lg p-4 ${className || ''}`}>
      <h3 className="font-arcade text-xl text-glow-green mb-3">TOP {limit}</h3>
      {loading && <div className="font-mono text-sm text-gray-300">Loading…</div>}
      {error && <div className="font-mono text-sm text-red-400">Error: {error}</div>}
      {!loading && !error && items.length === 0 && (
        <div className="font-mono text-sm text-gray-400">No scores yet.</div>
      )}
      <div className="space-y-2">
        {items.map((row: ScoreItem, i: number) => (
          <div
            key={`${row.name}-${row.createdAt}-${i}`}
            className="flex items-center justify-between bg-gray-800/50 px-3 py-2 rounded"
          >
            <div className="font-mono text-sm text-neon-green flex items-center gap-3">
              <span className="text-neon-yellow w-6 text-right">{i + 1}.</span>
              <span>{row.name}</span>
            </div>
            <div className="font-mono text-sm text-neon-cyan">
              {row.score.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
