// src/app/api/images/batch/route.ts
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

type Manifest = {
  files?: { ai_generated?: string[]; human?: string[] };
  publicBaseUrl?: string; // e.g. "/data_set/anime_art/digital_art"
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function GET(req: Request) {
  const startTime = Date.now();
  const url = new URL(req.url);

  // required: path=<top>/<leaf>  (e.g., "anime_art/digital_art")
  const reqPath = (url.searchParams.get('path') || '').replace(/^\/+|\/+$/g, '');
  const kindRaw = (url.searchParams.get('kind') || '').toLowerCase();
  const kind = kindRaw === 'ai' ? 'ai' : kindRaw === 'human' ? 'human' : null;
  const count = Math.max(1, Math.min(100, Number(url.searchParams.get('count') || 10)));
  const offset = Math.max(0, Number(url.searchParams.get('offset') || 0));

  console.log(`[BATCH API] GET request - Path: "${reqPath}", Kind: "${kind}", Count: ${count}, Offset: ${offset} - ${new Date().toISOString()}`);

  try {
    if (!reqPath) {
      console.log(`[BATCH API] ❌ Missing path parameter`);
      return json({ error: 'Missing ?path=<top>/<leaf>' }, 400);
    }

    if (!kind) {
      console.log(`[BATCH API] ❌ Invalid kind parameter: "${kindRaw}"`);
      return json({ error: 'Invalid ?kind=ai|human' }, 400);
    }

    // Load the manifest (tiny JSON) from public
    const manifestUrl = new URL(`/data_set/${reqPath}/manifest.json`, url.origin);
    console.log(`[BATCH API] Fetching manifest: ${manifestUrl.toString()}`);

    const res = await fetch(manifestUrl.toString(), { cache: 'no-store' });
    if (!res.ok) {
      console.log(`[BATCH API] ❌ Manifest not found - Status: ${res.status} - Path: "${reqPath}"`);
      return json(
        { error: 'Leaf manifest not found', path: reqPath, expected: manifestUrl.pathname },
        404
      );
    }

    const m = (await res.json()) as Manifest;
    const base = m.publicBaseUrl ?? `/data_set/${reqPath}`;

    const aiList = m.files?.ai_generated ?? [];
    const huList = m.files?.human ?? [];
    const list = kind === 'ai' ? aiList : huList;
    const total = list.length;

    if (total === 0) {
      console.log(`[BATCH API] ⚠️ No images available - Path: "${reqPath}", Kind: "${kind}"`);
      return json({
        items: [],
        total,
        offset,
        nextOffset: offset,
        kind,
        path: reqPath,
        note: 'No images available for this kind in the selected leaf.',
      });
    }

    // Paginate without repeats in a single response
    const slice = list.slice(offset, offset + count);
    const nextOffset = Math.min(offset + slice.length, total);

    const items = slice.map((file, i) => ({
      // synthetic ID to keep shape; combine offset to remain stable
      id: offset + i,
      url: `${base}/${kind === 'ai' ? 'ai_generated' : 'human'}/${file}`,
      isAI: kind === 'ai',
    }));

    const duration = Date.now() - startTime;
    console.log(`[BATCH API] ✅ Success - Path: "${reqPath}", Kind: "${kind}", Returned: ${items.length}/${total} images - Duration: ${duration}ms`);

    return json({
      items,
      total,
      offset,
      nextOffset,
      kind,
      path: reqPath,
      publicBaseUrl: base,
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error(`[BATCH API] ❌ Error - Path: "${reqPath}", Kind: "${kind}" - Duration: ${duration}ms - Error:`, err);
    return json({ error: err?.message ?? 'Unexpected error' }, 500);
  }
}