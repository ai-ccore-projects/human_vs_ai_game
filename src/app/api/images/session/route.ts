// src/app/api/images/session/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

type SessionRow = { id: number; created_at: number };

export async function POST() {
  const createdAt = Date.now();
  const stmt = db.prepare('INSERT INTO image_sessions (created_at) VALUES (?)');
  const info = stmt.run(createdAt);

  return NextResponse.json({ sessionId: Number(info.lastInsertRowid) });
}
