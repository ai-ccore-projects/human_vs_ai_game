'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';

type DatasetListing = {
  path: string;
  folders: string[];
  files?: Record<string, string[]>;
  publicBaseUrl?: string;
};

type Props = {
  value?: string | null;             // e.g., "classic_paintings/oil_on_canvas"
  onChange: (leaf: string) => void;  // called when user selects a subfolder
  label?: string;                    // UI label text
};

export default function InterestDropdown({
  value,
  onChange,
  label = 'Choose your arena',
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [topFolders, setTopFolders] = React.useState<string[]>([]);
  const [subMap, setSubMap] = React.useState<Record<string, string[]>>({});
  const [loadingTop, setLoadingTop] = React.useState(false);

  // NEW: which left-side domain is currently active/hovered
  const [activeTop, setActiveTop] = React.useState<string | null>(null);

  // Load top-level folders once
  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingTop(true);
      try {
        const r = await fetch('/api/dataset', { cache: 'no-store' });
        const d: DatasetListing = await r.json();
        if (!alive) return;
        const folders = d.folders ?? [];
        setTopFolders(folders);
        // default active domain
        if (folders.length && !activeTop) setActiveTop(folders[0]);
      } catch (e) {
        console.error('Failed to fetch dataset list', e);
        if (alive) setTopFolders([]);
      } finally {
        if (alive) setLoadingTop(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefetch subfolders for a specific top (idempotent)
  const prefetchInner = React.useCallback(async (top: string) => {
    if (subMap[top]) return; // already fetched
    let alive = true;
    try {
      const r = await fetch(`/api/dataset?path=${encodeURIComponent(top)}`, { cache: 'no-store' });
      const d: DatasetListing = await r.json();
      if (!r.ok) throw new Error((d as any)?.error || 'Failed to load subfolders');
      if (!alive) return;
      setSubMap(prev => ({ ...prev, [top]: (d.folders ?? []).slice().sort() }));
    } catch (err) {
      console.error('Failed to fetch subfolders for', top, err);
      if (alive) setSubMap(prev => ({ ...prev, [top]: [] }));
    }
    return () => { alive = false; };
  }, [subMap]);

  const selectedLabel = React.useMemo(() => {
    if (!value) return '';
    const parts = value.split('/');
    return parts[parts.length - 1].replace(/_/g, ' ');
  }, [value]);

  // The leaves shown on the right strictly follow activeTop
  const activeLeaves = React.useMemo(() => {
    if (!activeTop) return [];
    return subMap[activeTop] ?? [];
  }, [activeTop, subMap]);

  return (
    <div className="relative inline-block w-full max-w-2xl text-white font-arcade">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between bg-black/80 border border-cyan-400/50 rounded-lg px-4 py-3 text-white shadow-[0_0_20px_rgba(0,255,255,0.25)] hover:border-cyan-400/80 transition-all"
      >
        <span className="opacity-80">{label}</span>
        <span className="flex items-center gap-2">
          <span className="text-cyan-300">
            {value ? selectedLabel : '-- select --'}
          </span>
          <ChevronDown className="w-4 h-4 opacity-70" />
        </span>
      </button>

      {open && (
        <div
          className="absolute z-30 mt-2 w-full bg-black/95 border border-cyan-400/40 rounded-lg p-2 grid grid-cols-1 md:grid-cols-2 gap-2"
          onMouseLeave={() => setOpen(false)}
        >
          {/* LEFT PANEL — top-level folders */}
          <div className="max-h-72 overflow-auto pr-1">
            {loadingTop && (
              <div className="px-3 py-2 text-white/60 text-sm">Loading…</div>
            )}
            {!loadingTop && topFolders.length === 0 && (
              <div className="px-3 py-2 text-red-400 text-sm">
                No arenas found
              </div>
            )}
            {topFolders.map(top => {
              const isActive = top === activeTop;
              return (
                <div
                  key={top}
                  className={`group px-3 py-2 rounded cursor-pointer hover:bg-cyan-400/10 flex justify-between items-center ${
                    isActive ? 'bg-cyan-400/10' : ''
                  }`}
                  onMouseEnter={() => {
                    setActiveTop(top);      // <-- set explicit active domain
                    void prefetchInner(top); // <-- prefetch its leaves
                  }}
                  onClick={() => {
                    setActiveTop(top);
                    void prefetchInner(top);
                  }}
                >
                  <span className="text-white capitalize">
                    {top.replace(/_/g, ' ')}
                  </span>
                  <span className="text-cyan-300 text-xs opacity-70">▶</span>
                </div>
              );
            })}
          </div>

          {/* RIGHT PANEL — subfolders for the active top only */}
          <div className="max-h-72 overflow-auto border-l border-cyan-400/20 pl-2">
            {!activeTop && (
              <div className="px-3 py-2 text-white/50 text-sm">
                Hover a domain →
              </div>
            )}
            {activeTop && !subMap[activeTop] && (
              <div className="px-3 py-2 text-white/50 text-sm">
                Loading…
              </div>
            )}
            {activeTop && subMap[activeTop] && activeLeaves.length === 0 && (
              <div className="px-3 py-2 text-white/50 text-sm">
                No modes in this domain
              </div>
            )}
            {activeTop && activeLeaves.map(inner => (
              <button
                key={inner}
                onClick={() => {
                  onChange(`${activeTop}/${inner}`);
                  setOpen(false);
                }}
                className="block w-full text-left px-3 py-2 rounded hover:bg-cyan-400/10 text-white capitalize"
              >
                {inner.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
