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
  try {
    const url = new URL(req.url);

    // required: path=<top>/<leaf>  (e.g., "anime_art/digital_art")
    const reqPath = (url.searchParams.get('path') || '').replace(/^\/+|\/+$/g, '');
    if (!reqPath) return json({ error: 'Missing ?path=<top>/<leaf>' }, 400);

    // keep compatibility with your caller (but we don’t use it server-side)
    const kindRaw = (url.searchParams.get('kind') || '').toLowerCase();
    const kind = kindRaw === 'ai' ? 'ai' : kindRaw === 'human' ? 'human' : null;
    if (!kind) return json({ error: 'Invalid ?kind=ai|human' }, 400);

    const count = Math.max(1, Math.min(100, Number(url.searchParams.get('count') || 10)));
    const offset = Math.max(0, Number(url.searchParams.get('offset') || 0));

    // Load the manifest (tiny JSON) from public
    const manifestUrl = new URL(`/data_set/${reqPath}/manifest.json`, url.origin);
    const res = await fetch(manifestUrl.toString(), { cache: 'no-store' });
    if (!res.ok) {
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
    return json({ error: err?.message ?? 'Unexpected error' }, 500);
  }
}
