import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth'; // lightweight docx → text converter

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leaf = searchParams.get('path'); // e.g. classic_paintings/oil_on_canvas
    const num = searchParams.get('num');   // e.g. "3"

    if (!leaf || !num) {
      return NextResponse.json({ error: 'Missing path or num' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'public', 'data_set', leaf, 'meta_data', `${num}.docx`);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const buffer = fs.readFileSync(filePath);
    const { value: text } = await mammoth.extractRawText({ buffer });

    return NextResponse.json({ num, text });
  } catch (err: any) {
    console.error('Error reading metadata:', err);
    return NextResponse.json({ error: 'Failed to load metadata' }, { status: 500 });
  }
}
