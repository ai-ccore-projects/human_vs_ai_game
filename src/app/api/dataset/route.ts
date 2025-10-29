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
  try {
    const url = new URL(req.url);
    const reqPath = (url.searchParams.get('path') || '')
      .replace(/^\/+|\/+$/g, '')
      .replace(/\.+/g, '.');

    const manifestUrl = new URL(
      `/data_set/${reqPath ? reqPath + '/' : ''}manifest.json`,
      url.origin
    );

    const res = await fetch(manifestUrl.toString(), { cache: 'no-store' });
    if (!res.ok) {
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

    return json({
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
    });
  } catch (err: any) {
    return json({ error: err?.message ?? 'Unexpected error' }, 500);
  }
}
