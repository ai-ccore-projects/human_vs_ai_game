// src/app/api/images/next/route.ts
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

type Manifest = {
  files?: { ai_generated?: string[]; human?: string[] };
  publicBaseUrl?: string; // e.g. "/data_set/anime_art/digital_art"
};

function json(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), {
    status: s,
    headers: { 'content-type': 'application/json' },
  });
}

function pick<T>(arr: T[]): T | null {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * GET /api/images/next?path=<top>/<leaf>
 * Returns a random pair: { images: [{url,type},{url,type}], aiIndex }
 */
export async function GET(req: Request) {
  const startTime = Date.now();
  const url = new URL(req.url);
  const reqPath = (url.searchParams.get('path') || '').replace(/^\/+|\/+$/g, '');

  console.log(`[NEXT API] GET request - Path: "${reqPath}" - ${new Date().toISOString()}`);

  try {
    if (!reqPath) {
      console.log(`[NEXT API] ❌ Missing path parameter`);
      return json({ error: 'Missing ?path=<top>/<leaf>' }, 400);
    }

    // Load the leaf manifest that the dataset route also uses
    const manifestUrl = new URL(`/data_set/${reqPath}/manifest.json`, url.origin);
    console.log(`[NEXT API] Fetching manifest: ${manifestUrl.toString()}`);

    const res = await fetch(manifestUrl.toString(), { cache: 'no-store' });
    if (!res.ok) {
      console.log(`[NEXT API] ❌ Manifest not found - Status: ${res.status} - Path: "${reqPath}"`);
      return json({ error: 'Leaf manifest not found', path: reqPath }, 404);
    }

    const m = (await res.json()) as Manifest;
    const base = m.publicBaseUrl ?? `/data_set/${reqPath}`;
    const ai  = m.files?.ai_generated ?? [];
    const hum = m.files?.human ?? [];

    console.log(`[NEXT API] Available images - AI: ${ai.length}, Human: ${hum.length}`);

    // Need at least one from each group
    const aiFile = pick(ai);
    const huFile = pick(hum);
    if (!aiFile || !huFile) {
      console.log(`[NEXT API] ❌ Insufficient images - AI: ${ai.length}, Human: ${hum.length}`);
      return json(
        {
          error: 'Not enough images in leaf (need ≥1 AI and ≥1 Human)',
          path: reqPath,
          counts: { ai: ai.length, human: hum.length },
        },
        400
      );
    }

    // Random side for AI
    const aiIndex = Math.random() < 0.5 ? 0 : 1;
    const images = new Array(2) as { url: string; type: 'ai' | 'human' }[];
    images[aiIndex]     = { url: `${base}/ai_generated/${aiFile}`, type: 'ai' };
    images[1 - aiIndex] = { url: `${base}/human/${huFile}`,       type: 'human' };

    const duration = Date.now() - startTime;
    console.log(`[NEXT API] ✅ Success - Path: "${reqPath}", AI at index: ${aiIndex}, Files: "${aiFile}", "${huFile}" - Duration: ${duration}ms`);

    return json({
      images,
      aiIndex,
      leafPath: reqPath,
      counts: { ai: ai.length, human: hum.length },
      publicBaseUrl: base,
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error(`[NEXT API] ❌ Error - Path: "${reqPath}" - Duration: ${duration}ms - Error:`, err);
    return json({ error: err?.message ?? 'Unexpected error' }, 500);
  }
}
