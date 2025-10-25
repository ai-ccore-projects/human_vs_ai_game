'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type Props = {
  visible: boolean;
  statusText: string;
  caption: string;
  captionsOn: boolean;
  onToggleCC: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onSkip: () => void;
  isPaused: boolean;
};

const NarrationOverlay: React.FC<Props> = ({
  visible,
  statusText,
  caption,
  captionsOn,
  onToggleCC,
  onPause,
  onResume,
  onSkip,
  isPaused,
}) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/60 grid place-items-end"
        >
          <div className="w-full md:w-[720px] mx-auto mb-6 px-4">
            <div className="rounded-lg border border-cyan-400 bg-black/80 p-3 shadow-lg">
              <div className="flex items-center justify-between text-xs text-white/80 font-mono mb-2">
                <div>Voice Guide: {statusText}</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onToggleCC}
                    className="px-2 py-1 border rounded hover:bg-white/10"
                  >
                    {captionsOn ? 'CC: ON' : 'CC: OFF'}
                  </button>
                  {!isPaused ? (
                    <button
                      onClick={onPause}
                      className="px-2 py-1 border rounded hover:bg-white/10"
                    >
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={onResume}
                      className="px-2 py-1 border rounded hover:bg-white/10"
                    >
                      Resume
                    </button>
                  )}
                  <button
                    onClick={onSkip}
                    className="px-2 py-1 border rounded hover:bg-red-500/20"
                  >
                    Skip
                  </button>
                </div>
              </div>

              <div
                className={`min-h-[3.25rem] px-3 py-2 rounded bg-black/60 border border-white/10 ${
                  captionsOn ? 'block' : 'hidden'
                }`}
                aria-live="polite"
              >
                <span className="font-arcade text-[0.95rem] text-glow">
                  {caption || '…'}
                </span>
              </div>

              <div className="text-[10px] text-white/50 mt-2">
                Tip: You can toggle captions, pause, or skip the intro.
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NarrationOverlay;
