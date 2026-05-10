import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.URL || "https://eduai-studio.netlify.app";

function buildNotesPrompt(topic: string, audience: string, generateMCQs: boolean, generateMindMap: boolean, format: string): string {
  let formatInstruction = "";
  if (format === "simple") {
    formatInstruction = "Use simple language, short paragraphs, and many analogies. Focus on making the concept extremely easy to understand for a layperson.";
  } else if (format === "revision") {
    formatInstruction = "Focus on the 'Cheat Sheet' aspect. Use bullet points extensively. Highlight core formulas, keywords, and must-know facts. Be concise and exam-oriented.";
  } else {
    formatInstruction = "Follow a high-quality academic textbook format. Provide deep theoretical explanations, detailed context, and structured academic rigor.";
  }

  return `Generate comprehensive academic notes for: "${topic}"
Target Audience: ${audience}
Format: ${format.toUpperCase()} (${formatInstruction})

Use markdown with emojis, tables, and clear headings.
YOU MUST INCLUDE ALL THESE SECTIONS IN ORDER:

## 📖 1. TOPIC OVERVIEW
Definition, real-world relevance, and core applications.

## 🧠 2. CORE CONCEPTS
Key terms, simple explanations, and common misconceptions.

${generateMindMap ? `## 🗺️ 3. MINDMAP & HIERARCHY
You MUST use a Mermaid.js diagram.
\`\`\`mermaid
graph TD
  A["Main Concept"] --> B["Sub Topic"]
\`\`\`` : ''}

## 📚 ${generateMindMap ? '4' : '3'}. IN-DEPTH EXPLANATION
Detailed theoretical context and comparison tables.

## ⚙️ ${generateMindMap ? '5' : '4'}. PROCESS & WORKFLOW
Step-by-step breakdown of how it works.

## 🔬 ${generateMindMap ? '6' : '5'}. PRACTICAL EXAMPLES & CODE
Provide working code or worked examples with formulas.

## 🖼️ ${generateMindMap ? '7' : '6'}. VISUAL LEARNING
Embed a relevant diagram:
![Educational Diagram](https://pollinations.ai/p/Highly%20detailed%20educational%20diagram%20of%20${topic}?width=800&height=400&nologo=true)

## 🎯 ${generateMindMap ? '8' : '7'}. INTERVIEW & EXAM PREP
Top 5 Q&A and exam answers.

${generateMCQs ? `## ❓ ${generateMindMap ? '9' : '8'}. MCQs
PROVIDE 5 MCQs in a JSON array inside a \`\`\`mcq block:
\`\`\`mcq
[
  {"question": "...", "options": ["...", "..."], "answerIndex": 0, "explanation": "..."}
]
\`\`\`` : ''}

## 🌍 ${generateMindMap ? (generateMCQs ? '10' : '9') : (generateMCQs ? '9' : '8')}. REAL-WORLD APPLICATIONS
Industry examples and trends.

## ⚡ ${generateMindMap ? (generateMCQs ? '11' : '10') : (generateMCQs ? '10' : '9')}. REVISION CHEAT SHEET
Top 10 points and formulas.

## 🚀 ${generateMindMap ? (generateMCQs ? '12' : '11') : (generateMCQs ? '11' : '10')}. ADVANCED LEARNING & ROADMAP
Prerequisites and path forward.

## ✅ SUMMARY
Final recap and takeaways.

Be highly accurate and exam-oriented. Use tables and bullet points extensively.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, audience, generateMCQs = true, generateMindMap = false, format = "detailed" } = body;

    if (!topic || !audience) {
      return NextResponse.json(
        { error: "Missing required fields: topic, audience" },
        { status: 400 }
      );
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const prompt = buildNotesPrompt(topic, audience, generateMCQs, generateMindMap, format);

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
              content:
                "You are an expert academic tutor and university professor across all subjects (Science, Math, Humanities, Computer Science). Generate comprehensive, well-structured, exam-ready notes tailored strictly to the subject domain of the topic provided. Be thorough yet clear.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 4096,
          temperature: 0.6,
          stream: true,
        }),
      }
    );

    if (!apiResponse.ok) {
      let errorMsg = `API error (${apiResponse.status})`;
      try {
        const contentType = apiResponse.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await apiResponse.json();
          errorMsg = errorData?.error?.message || JSON.stringify(errorData);
        } else {
          const text = await apiResponse.text();
          errorMsg = text.slice(0, 100) + (text.length > 100 ? "..." : "");
        }
      } catch (e) {
        errorMsg = "Could not parse API error response";
      }
      return NextResponse.json(
        { error: `OpenRouter Error: ${errorMsg}` },
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
    console.error("Notes generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
