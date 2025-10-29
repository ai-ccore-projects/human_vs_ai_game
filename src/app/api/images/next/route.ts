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
  try {
    const url = new URL(req.url);
    const reqPath = (url.searchParams.get('path') || '').replace(/^\/+|\/+$/g, '');
    if (!reqPath) return json({ error: 'Missing ?path=<top>/<leaf>' }, 400);

    // Load the leaf manifest that the dataset route also uses
    const manifestUrl = new URL(`/data_set/${reqPath}/manifest.json`, url.origin);
    const res = await fetch(manifestUrl.toString(), { cache: 'no-store' });
    if (!res.ok) return json({ error: 'Leaf manifest not found', path: reqPath }, 404);

    const m = (await res.json()) as Manifest;
    const base = m.publicBaseUrl ?? `/data_set/${reqPath}`;
    const ai  = m.files?.ai_generated ?? [];
    const hum = m.files?.human ?? [];

    // Need at least one from each group
    const aiFile = pick(ai);
    const huFile = pick(hum);
    if (!aiFile || !huFile) {
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

    return json({
      images,
      aiIndex,
      leafPath: reqPath,
      counts: { ai: ai.length, human: hum.length },
      publicBaseUrl: base,
    });
  } catch (err: any) {
    return json({ error: err?.message ?? 'Unexpected error' }, 500);
  }
}
