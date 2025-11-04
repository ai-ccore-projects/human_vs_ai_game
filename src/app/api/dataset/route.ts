export const runtime = 'edge';
export const dynamic = 'force-dynamic';

type Manifest = {
  folders?: string[];
  files?: { ai_generated?: string[]; human?: string[]; meta?: string[] };
  publicBaseUrl?: string;
  metaFolderName?: string | null;
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
  const reqPath = (url.searchParams.get('path') || '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\.+/g, '.');

  console.log(`[DATASET API] GET request - Path: "${reqPath || '(root)'}" - ${new Date().toISOString()}`);

  try {
    const manifestUrl = new URL(
      `/data_set/${reqPath ? reqPath + '/' : ''}manifest.json`,
      url.origin
    );

    console.log(`[DATASET API] Fetching manifest: ${manifestUrl.toString()}`);

    const res = await fetch(manifestUrl.toString(), { cache: 'no-store' });
    if (!res.ok) {
      console.log(`[DATASET API] ❌ Manifest not found - Status: ${res.status} - Path: "${reqPath || '(root)'}"`);
      return json(
        {
          error: 'Manifest not found',
          path: reqPath || '(root)',
          expected: `/public/data_set/${reqPath ? reqPath + '/' : ''}manifest.json`,
        },
        404
      );
    }

    const m = (await res.json()) as Manifest;
    const response = {
      path: reqPath,
      folders: Array.isArray(m.folders) ? m.folders : [],
      files: {
        ai_generated: m.files?.ai_generated ?? [],
        human: m.files?.human ?? [],
        meta: m.files?.meta ?? [],
      },
      publicBaseUrl: m.publicBaseUrl ?? `/data_set/${reqPath}`,
      metaFolderName:
        typeof m.metaFolderName === 'string' || m.metaFolderName === null
          ? m.metaFolderName
          : null,
    };

    const duration = Date.now() - startTime;
    console.log(`[DATASET API] ✅ Success - Path: "${reqPath || '(root)'}" - Files: AI(${response.files.ai_generated.length}), Human(${response.files.human.length}) - Duration: ${duration}ms`);

    return json(response);
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error(`[DATASET API] ❌ Error - Path: "${reqPath || '(root)'}" - Duration: ${duration}ms - Error:`, err);
    return json({ error: err?.message ?? 'Unexpected error' }, 500);
  }
}
