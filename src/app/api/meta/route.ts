import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth'; // lightweight docx → text converter

export async function GET(request: Request) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const leaf = searchParams.get('path'); // e.g. classic_paintings/oil_on_canvas
  const num = searchParams.get('num');   // e.g. "3"

  console.log(`[META API] GET request - Path: "${leaf}", Num: "${num}" - ${new Date().toISOString()}`);

  try {
    if (!leaf || !num) {
      console.log(`[META API] ❌ Missing parameters - Path: "${leaf}", Num: "${num}"`);
      return NextResponse.json({ error: 'Missing path or num' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'public', 'data_set', leaf, 'meta_data', `${num}.docx`);
    console.log(`[META API] Looking for file: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      console.log(`[META API] ❌ File not found: ${filePath}`);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const buffer = fs.readFileSync(filePath);
    const { value: text } = await mammoth.extractRawText({ buffer });

    const duration = Date.now() - startTime;
    console.log(`[META API] ✅ Successfully extracted text - Path: "${leaf}", Num: "${num}", Length: ${text.length} chars - Duration: ${duration}ms`);

    return NextResponse.json({ num, text });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error(`[META API] ❌ Error reading metadata - Path: "${leaf}", Num: "${num}" - Duration: ${duration}ms - Error:`, err);
    return NextResponse.json({ error: 'Failed to load metadata' }, { status: 500 });
  }
}
