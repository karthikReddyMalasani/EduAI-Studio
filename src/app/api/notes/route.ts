import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.URL || "https://eduai-studio.netlify.app";

function buildNotesPrompt(topic: string, audience: string, generateMCQs: boolean, generateMindMap: boolean): string {
  return `Generate comprehensive academic notes for the topic: "${topic}"
Target Audience: ${audience}

First, determine the subject domain of this topic (e.g., Computer Science, Biology, Physics, Mathematics, History, etc.). Adapt your explanations perfectly to this domain.

Use markdown with emojis, tables, and clear formatting. Cover the following sections comprehensively:

# 📖 1. TOPIC OVERVIEW
Definition, why it matters, real-world relevance, and core applications.

# 🧠 2. CORE CONCEPTS
For each key concept: definition, simple explanation, important points, and common misconceptions.

${generateMindMap ? `# 🗺️ 3. MINDMAP & HIERARCHY
Provide a visual representation of the topic. If possible, use an ASCII tree, nested bullet points, or a Mermaid.js diagram to show how all the sub-topics connect to the main concept.` : ''}

# 📚 ${generateMindMap ? '4' : '3'}. IN-DEPTH EXPLANATION
Detailed theoretical explanation. If it's a scientific/math topic, include derivations, rules, and fundamental principles. If history/arts, include context and impact. Include a comparison table if applicable.

# ⚙️ ${generateMindMap ? '5' : '4'}. PROCESS / WORKFLOW / ALGORITHM
Step-by-step breakdown of how it works. 
- If Science/Math: Explain the physical process, biological cycle, or mathematical proof.
- If Tech/Coding: Explain the algorithm, pseudocode, and time/space complexity.

# 🔬 ${generateMindMap ? '6' : '5'}. PRACTICAL EXAMPLES & FORMULAS (OR CODE)
- If Science/Math: Provide 2-3 detailed practical examples, crucial formulas, and how to apply them.
- If Tech/Coding: Provide working code in Python/JavaScript with comments.
- If Humanities: Provide historical examples, case studies, or quotes.

# 🖼️ ${generateMindMap ? '7' : '6'}. VISUAL LEARNING
Provide 1-2 highly relevant, generated images or diagrams to help visualize the concept.
You MUST embed these images using the following exact markdown format:
![Description of image](https://image.pollinations.ai/prompt/Highly%20detailed%20educational%20diagram%20of%20[YOUR_URL_ENCODED_CONCEPT_HERE]?width=800&height=400&nologo=true)
Ensure the image prompt in the URL describes exactly what should be drawn and is strictly URL-encoded (use %20 for spaces).
Also include a brief textual description of mental models or graphical intuition.

# 🎯 ${generateMindMap ? '8' : '7'}. INTERVIEW & VIVA QUESTIONS
- 3 Basic questions
- 3 Intermediate questions
- 2 Advanced questions
(Include concise answers for all)

# 📝 ${generateMindMap ? '9' : '8'}. EXAM PREPARATION
- 3 short-answer questions
- 2 detailed descriptive questions
- 1 essay/long-form question
(Include structured answers)

${generateMCQs ? `# ❓ ${generateMindMap ? '10' : '9'}. MCQs
Provide 5 Multiple Choice Questions. You MUST format them EXACTLY as a single JSON array inside a \`\`\`mcq code block.
Example:
\`\`\`mcq
[
  {
    "question": "What is the capital of France?",
    "options": ["London", "Paris", "Berlin", "Madrid"],
    "answerIndex": 1,
    "explanation": "Paris is the capital of France."
  }
]
\`\`\`
Do not write anything else in this section outside the mcq code block.` : ''}

# 🔢 ${generateMindMap ? (generateMCQs ? '11' : '10') : (generateMCQs ? '10' : '9')}. PROBLEM SOLVING & CASE STUDIES
Provide 2 practice problems, analytical scenarios, or case studies with complete step-by-step solutions.

# 🌍 11. REAL-WORLD APPLICATIONS
Where is this used in the real world today? Give specific industry or everyday examples.

# ⚡ 12. REVISION CHEAT SHEET
One-night-before summary: Top 10 must-remember bullet points, core formulas, or key dates/syntax.

# ⚠️ 13. COMMON MISTAKES
Mistakes students make in exams, labs, or interviews regarding this topic, and how to avoid them.

# 🚀 14. ADVANCED LEARNING
Advanced concepts, active research areas, and what the student should learn next.

# 🗺️ 15. LEARNING ROADMAP
Prerequisites → Beginner → Intermediate → Advanced path for mastering this subject.

# ✅ 16. SUMMARY
Final recap and the absolute top 5 takeaways.

Be highly accurate, perfectly tailored to the subject domain, and exam-oriented. Use tables and bullet points extensively for readability.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, audience, generateMCQs = true, generateMindMap = false } = body;

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

    const prompt = buildNotesPrompt(topic, audience, generateMCQs, generateMindMap);

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
    console.error("Notes generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
