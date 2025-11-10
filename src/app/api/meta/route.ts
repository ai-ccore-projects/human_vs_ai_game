// app/api/meta/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth'; // lightweight docx → text converter

export async function GET(request: Request) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const leaf = searchParams.get('path'); // e.g. classic_paintings/oil_on_canvas
  const num = searchParams.get('num');   // e.g. "3"

  console.log(`[META API] GET - Path: "${leaf}", Num: "${num}"`);

  try {
    if (!leaf || !num) {
      // No user-facing error; just return no text.
      return NextResponse.json({ text: null }, { status: 200 });
    }

    const filePath = path.join(process.cwd(), 'public', 'data_set', leaf, 'meta_data', `${num}.docx`);
    console.log(`[META API] Checking file: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      console.log(`[META API] No metadata for ${num}`);
      // Return empty text; UI will simply not render the info panel.
      return NextResponse.json({ text: null }, { status: 200 });
    }

    const buffer = fs.readFileSync(filePath);
    const { value: raw } = await mammoth.extractRawText({ buffer });
    const text = (raw || '').trim();

    console.log(`[META API] ✅ Extracted ${text.length} chars in ${Date.now() - startTime}ms`);
    return NextResponse.json({ text: text || null }, { status: 200 });
  } catch (err) {
    console.error(`[META API] ❌ Error`, err);
    // Still return { text: null } so the UI stays clean.
    return NextResponse.json({ text: null }, { status: 200 });
  }
}
