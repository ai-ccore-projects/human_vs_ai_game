'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { preloadImage } from '@/utils/preloadImage';

type Props = {
  src: string | null | undefined;
  alt: string;
  /** classes for the wrapper (positioning/size). */
  className?: string;
  /** classes for the <img> itself. */
  imgClassName?: string;
  maxRetries?: number;
  /** Fired once the image is fully decoded and shown. */
  onReady?: () => void;
  /** Fired when the image could not be loaded after all retries. */
  onPermanentError?: (src: string) => void;
};

/**
 * Renders an image that is GUARANTEED never to show a blank/broken box:
 * it pre-decodes the bitmap (with retries + cache-busting) and only paints
 * once ready. On permanent failure it shows a clear placeholder and notifies
 * the parent so the game can skip a bad asset instead of stalling.
 */
const ReliableImage: React.FC<Props> = ({
  src,
  alt,
  className = 'w-full h-full',
  imgClassName = 'w-full h-full object-cover',
  maxRetries = 4,
  onReady,
  onPermanentError,
}) => {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // Keep callbacks in refs so changing-identity callbacks don't restart loading.
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onPermanentError);
  onReadyRef.current = onReady;
  onErrorRef.current = onPermanentError;

  useEffect(() => {
    let cancelled = false;
    setResolvedSrc(null);
    setFailed(false);

    if (!src) {
      setFailed(true);
      onErrorRef.current?.('');
      return;
    }

    preloadImage(src, maxRetries).then((resolved) => {
      if (cancelled) return;
      if (resolved) {
        setResolvedSrc(resolved);
        onReadyRef.current?.();
      } else {
        setFailed(true);
        onErrorRef.current?.(src);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [src, maxRetries]);

  if (failed) {
    return (
      <div className={`${className} relative`}>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 gap-2">
          <div className="font-arcade text-2xl text-red-400">IMAGE UNAVAILABLE</div>
          <div className="font-mono text-xs text-white/50">loading next…</div>
        </div>
      </div>
    );
  }

  if (!resolvedSrc) {
    return (
      <div className={`${className} relative`}>
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="font-arcade text-4xl text-yellow-400 animate-pulse">LOADING...</div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <img
        src={resolvedSrc}
        alt={alt}
        className={imgClassName}
        draggable={false}
        // Extremely rare: a decoded image evicted/failed at paint time — recover.
        onError={() => {
          setResolvedSrc(null);
          setFailed(true);
          onErrorRef.current?.(src ?? '');
        }}
      />
    </motion.div>
  );
};

export default ReliableImage;
