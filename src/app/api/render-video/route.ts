import { NextResponse } from 'next/server';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { bundle } from '@remotion/bundler';
import path from 'path';
import fs from 'fs';
import os from 'os';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { scriptData, topic } = body;
    
    if (!scriptData) {
      return NextResponse.json({ error: 'No script data provided' }, { status: 400 });
    }

    const compositionId = scriptData.videoType === 'algorithm' ? 'AlgorithmVideo' : 'GenericVideo';
    const durationInFrames = scriptData.videoType === 'algorithm' 
      ? (scriptData.steps?.length * 60) + 30 
      : (scriptData.scenes?.length * 120) + 30;

    const inputProps = {
      ...scriptData,
      title: scriptData.title || topic,
      showCaptions: true,
    };

    const serveUrl = path.join(process.cwd(), 'src', 'remotion', 'index.ts');
    
    console.log("Bundling Remotion App...");
    const bundled = await bundle({
      entryPoint: serveUrl,
    });

    console.log("Selecting Composition...");
    const composition = await selectComposition({
      serveUrl: bundled,
      id: compositionId,
      inputProps,
    });

    const outputLocation = path.join(os.tmpdir(), `remotion-${Date.now()}.mp4`);

    console.log("Rendering Media...");
    await renderMedia({
      composition: {
        ...composition,
        durationInFrames: durationInFrames || 1200,
      },
      serveUrl: bundled,
      codec: 'h264',
      outputLocation,
      inputProps,
    });

    console.log("Render successful, reading file...");
    const fileBuffer = fs.readFileSync(outputLocation);
    
    // Cleanup
    fs.unlinkSync(outputLocation);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${(topic || 'video').replace(/\s+/g,"-")}.mp4"`,
      },
    });

  } catch (error: any) {
    console.error("Error rendering video:", error);
    return NextResponse.json({ error: error.message || 'Render failed' }, { status: 500 });
  }
}
