// src/utils/preloadImage.ts
// Robust image preloading: fully fetch + decode an image before we ever show it,
// with bounded retries + cache-busting so a transient/edge-cached failure recovers.

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function loadOnce(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      img.onload = null;
      img.onerror = null;
      resolve(ok);
    };

    img.onload = async () => {
      // decode() guarantees the bitmap is ready to paint (no flash of blank box).
      try {
        if (typeof img.decode === 'function') await img.decode();
      } catch {
        // decode can reject on a benign race even though onload fired — treat as loaded.
      }
      done(true);
    };
    img.onerror = () => done(false);

    // Safety net: never hang forever on a stalled connection.
    const timeout = setTimeout(() => done(false), 12_000);
    img.src = src;
    void Promise.resolve().then(() => {
      // If it was already cached/complete synchronously, resolve fast.
      if (img.complete && img.naturalWidth > 0) {
        clearTimeout(timeout);
        done(true);
      }
    });
  });
}

/**
 * Resolve to the URL that successfully loaded (possibly with a retry query param),
 * or `null` if it could not be loaded after `maxRetries` attempts.
 */
export async function preloadImage(src: string, maxRetries = 4): Promise<string | null> {
  if (!src) return null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const candidate =
      attempt === 0 ? src : `${src}${src.includes('?') ? '&' : '?'}retry=${attempt}`;
    if (await loadOnce(candidate)) return candidate;
    if (attempt < maxRetries) await delay(Math.min(1500, 200 * 2 ** attempt));
  }
  return null;
}
