export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import fs from 'fs';
import path from 'path';

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
    const manifestPath = path.join(
      process.cwd(),
      'public',
      'data_set',
      reqPath || '',
      'manifest.json'
    );

    console.log(`[DATASET API] Reading manifest from: ${manifestPath}`);

    if (!fs.existsSync(manifestPath)) {
      console.log(`[DATASET API] ❌ Manifest file not found at: ${manifestPath}`);
      return json(
        {
          error: 'Manifest not found',
          path: reqPath || '(root)',
          expected: manifestPath,
        },
        404
      );
    }

    let m: Manifest;
    try {
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      m = JSON.parse(manifestContent) as Manifest;
      console.log(`[DATASET API] ✅ Manifest loaded successfully from file system`);
    } catch (parseError) {
      console.log(`[DATASET API] ❌ Failed to parse manifest JSON:`, parseError);
      return json({ error: 'Invalid manifest format' }, 500);
    }
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
