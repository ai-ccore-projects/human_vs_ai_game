import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // We default to "Bella" voice (EXAVITQu4vr4xnSDxMaL) or "Rachel" (21m00Tcm4TlvDq8ikWAM)
    // The user can customize this by passing voiceId if needed
    const { text, voiceId = 'EXAVITQu4vr4xnSDxMaL' } = await req.json();

    if (!text) {
      return new NextResponse('Text is required', { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error('[TTS] ELEVENLABS_API_KEY is missing in environment variables.');
      return new NextResponse('API Key missing', { status: 500 });
    }

    // Call ElevenLabs TTS API
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        // using english model for lowest latency
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TTS] ElevenLabs API error:', errorText);
      return new NextResponse(`ElevenLabs Error: ${response.statusText}`, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        // Cache the result for this exact text in the browser
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[TTS] Internal Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
