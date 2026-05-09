import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

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
          "HTTP-Referer": "http://localhost:3000",
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

    const data = await apiResponse.json();
    const content = data.choices[0]?.message?.content || "{}";
    
    let jsonResult;
    try {
      jsonResult = JSON.parse(content);
    } catch (e) {
      // Fallback to strip markdown if the model hallucinates it despite instructions
      const stripped = content.replace(/```json/g, "").replace(/```/g, "").trim();
      jsonResult = JSON.parse(stripped);
    }

    return NextResponse.json({ script: jsonResult, topic, audience, style, duration, mode });
  } catch (error) {
    console.error("Video script generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
