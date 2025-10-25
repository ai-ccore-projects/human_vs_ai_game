// app/api/dataset/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';        // ensure Node APIs available
export const dynamic = 'force-dynamic'; // avoid static caching

const ROOT = path.join(process.cwd(), 'public', 'data_set');

// Security: prevent directory traversal
function safeJoin(root: string, ...parts: string[]) {
  const p = path.join(root, ...parts);
  const rel = path.relative(root, p);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Invalid path');
  }
  return p;
}

function listFiles(dir: string, exts: string[]) {
  if (!fs.existsSync(dir)) return [];
  const lower = new Set(exts.map(e => e.toLowerCase()));
  return fs
    .readdirSync(dir)
    .filter(f => lower.has(path.extname(f).toLowerCase()));
}

// Example: GET /api/dataset?path=classic_paintings/oil_on_canvas
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const reqPath = (url.searchParams.get('path') || '').replace(/^\/+|\/+$/g, '');
    const base = reqPath ? safeJoin(ROOT, reqPath) : ROOT;

    if (!fs.existsSync(base)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const stat = fs.statSync(base);
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: 'Not a directory' }, { status: 400 });
    }

    const entries = fs.readdirSync(base, { withFileTypes: true });
    const folders = entries.filter(e => e.isDirectory()).map(e => e.name);

    // image folders
    const aiDir    = path.join(base, 'ai_generated');
    const humanDir = path.join(base, 'human');

    // metadata may be either meta_data OR meta
    const metaDataDir = fs.existsSync(path.join(base, 'meta_data'))
      ? path.join(base, 'meta_data')
      : fs.existsSync(path.join(base, 'meta'))
      ? path.join(base, 'meta')
      : null;

    const files: Record<string, string[]> = {};

    // allow both png and jpg/jpeg everywhere (people mix these)
    if (fs.existsSync(aiDir)) {
      files.ai_generated = listFiles(aiDir, ['.png', '.jpg', '.jpeg']);
    }
    if (fs.existsSync(humanDir)) {
      files.human = listFiles(humanDir, ['.png', '.jpg', '.jpeg']);
    }
    if (metaDataDir) {
      files.meta = listFiles(metaDataDir, ['.docx']); // unified key; client can use it if needed
    }

    return NextResponse.json({
      path: reqPath,
      folders,
      files,
      // base URL the client can prefix for public assets
      publicBaseUrl: `/data_set/${reqPath}`.replace(/\/+$/, ''),
      // expose which meta directory was detected (for debugging)
      metaFolderName: metaDataDir ? path.basename(metaDataDir) : null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error' }, { status: 500 });
  }
}
