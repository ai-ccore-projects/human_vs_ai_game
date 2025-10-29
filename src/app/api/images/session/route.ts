// src/app/api/images/session/route.ts
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Generate a JS-safe numeric session id.
 * Format: milliseconds * 1000 + small random (0..999)
 * -> stays under Number.MAX_SAFE_INTEGER and sorts by time.
 */
function newSessionId(): number {
  const ts = Date.now();
  const rnd = Number(crypto.getRandomValues(new Uint32Array(1))[0] % 1000);
  return ts * 1000 + rnd;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function POST() {
  const sessionId = newSessionId();
  return json({ sessionId, createdAt: Date.now() });
}
