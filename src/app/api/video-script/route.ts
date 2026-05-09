import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.URL || "https://eduai-studio.netlify.app";

function buildPrompt(topic: string, audience: string, style: string, duration: string, mode: string): string {
  return `Generate an educational video JSON script for the topic: "${topic}".
Target Audience: ${audience}. Style: ${style}. Duration: ${duration}.

First, classify the topic. If it is a specific coding algorithm or data structure that requires an array visualization (e.g., "Binary Search", "Kadane's Algorithm"), use the "algorithm" schema. For ANY other subject (Physics, Biology, History, Math, general programming concepts, etc.), use the "generic" schema.

You must return ONLY a valid JSON object matching one of these two schemas. Do NOT wrap it in markdown code blocks.

SCHEMA 1 (algorithm):
{
  "videoType": "algorithm",
  "title": "A catchy title",
  "array": [array of numbers, e.g. [-2, 1, -3, 4, 1]],
  "steps": [
    {
      "index": 0,
      "currentSum": -2,
      "maxSum": -2,
      "narration": "First, we look at..."
    }
  ]
}

SCHEMA 2 (generic):
{
  "videoType": "generic",
  "title": "A catchy title",
  "scenes": [
    {
      "keyword": "Main Concept (e.g. Sunlight)",
      "emoji": "☀️", // A single massive visual emoji representing this scene
      "bulletPoints": ["Point 1", "Point 2"],
      "narration": "Voiceover script for this scene..."
    }
  ]
}

Ensure you provide at least 5-8 steps or scenes. Make the narration highly engaging.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, audience, style, duration, mode = "standard" } = body;

    if (!topic || !audience || !style || !duration) {
      return NextResponse.json(
        { error: "Missing required fields: topic, audience, style, duration" },
        { status: 400 }
      );
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const prompt = buildPrompt(topic, audience, style, duration, mode);

    const apiResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": SITE_URL,
          "X-Title": "EduAI Studio",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-70b-instruct",
          messages: [
            {
              role: "system",
              content: "You are an AI that generates valid JSON data for programmatic video generation. You must return RAW JSON. Do not use markdown formatting like ```json.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          max_tokens: 4096,
          temperature: 0.75,
          stream: true,
        }),
      }
    );

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json();
      return NextResponse.json(
        { error: `API error: ${errorData?.error?.message || JSON.stringify(errorData)}` },
        { status: apiResponse.status }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = apiResponse.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (data === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(data);
                  const text = parsed.choices?.[0]?.delta?.content || '';
                  if (text) controller.enqueue(encoder.encode(text));
                } catch {
                  // skip malformed SSE chunks
                }
              }
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error("Video script generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
