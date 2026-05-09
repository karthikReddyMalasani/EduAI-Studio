import re
import json
import textwrap
import urllib.parse
import os
import requests
from pathlib import Path
from openai import OpenAI
from django.conf import settings

# ─────────────────────────────────────────────
# Provider Configuration
# ─────────────────────────────────────────────
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
GROQ_MODEL = "llama-3.3-70b-versatile"   # successor to decommissioned llama3-70b-8192

UNSPLASH_API_URL = "https://api.unsplash.com/search/photos"


# ─────────────────────────────────────────────
# Shared Groq client helper
# ─────────────────────────────────────────────
def _get_groq_client():
    api_key = getattr(settings, 'GROQ_API_KEY', '')
    if not api_key:
        raise ValueError("GROQ_API_KEY is not configured in backend/.env")
    return OpenAI(
        base_url=GROQ_BASE_URL,
        api_key=api_key,
        default_headers={
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "AI Syllabus App",
        }
    )


# ─────────────────────────────────────────────
# Unsplash Image Fetcher
# ─────────────────────────────────────────────
def fetch_unsplash_image(query: str) -> str:
    """
    Searches Unsplash for a high-quality photo matching the query.
    Returns the 'regular' sized image URL or falls back to placehold.co.
    """
    try:
        access_key = getattr(settings, 'UNSPLASH_ACCESS_KEY', '')
        if not access_key:
            raise ValueError("UNSPLASH_ACCESS_KEY not set")

        # Keep query concise for better Unsplash results
        short_query = textwrap.shorten(query, width=60, placeholder="")
        resp = requests.get(
            UNSPLASH_API_URL,
            params={
                "query": short_query,
                "per_page": 1,
                "orientation": "landscape",
                "content_filter": "high",
            },
            headers={"Authorization": f"Client-ID {access_key}"},
            timeout=8
        )
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results", [])
        if results:
            img_url = results[0]["urls"]["regular"]
            description = results[0].get("alt_description") or short_query
            print(f"DEBUG: Unsplash image found for '{short_query}': {img_url}")
            return img_url
    except Exception as e:
        print(f"DEBUG: Unsplash fetch failed for '{query}': {e}")

    # Graceful fallback to placeholder
    encoded = urllib.parse.quote(textwrap.shorten(query, width=80, placeholder="..."))
    return f"https://placehold.co/800x500/1e293b/94a3b8?text={encoded}"


# ─────────────────────────────────────────────
# MCQ Generation (Groq)
# ─────────────────────────────────────────────
def build_prompt(topics: list, difficulty: str, num_questions: int, subject: str) -> str:
    topic_list = "\n".join(f"- {t}" for t in topics)
    difficulty_guide = {
        "Easy": "Basic recall, definitions, and straightforward facts.",
        "Medium": "Application of concepts, problem-solving, and comprehension.",
        "Hard": "Analysis, synthesis, comparison of edge cases, and multi-step reasoning."
    }.get(difficulty, "Application of concepts.")

    return f"""You are an expert educator and exam setter for {subject}.

Generate exactly {num_questions} multiple-choice questions (MCQs) based on the following syllabus topics:
{topic_list}

Difficulty Level: {difficulty} — {difficulty_guide}

Rules:
1. Each question MUST have exactly 4 options labeled A, B, C, D.
2. Only ONE option must be correct.
3. Distractors must be plausible, relevant, and educationally meaningful.
4. Include a brief explanation (1-2 sentences) for the correct answer.
5. Avoid True/False format. Keep questions concise and unambiguous.
6. Vary question types: recall, application, calculation, comparison, scenario-based.
7. For code-related questions, include clear code snippets using markdown code blocks (```) and ensure the code follows line-by-line formatting for readability.
8. Do NOT repeat questions.

Respond ONLY with valid JSON in this exact format and nothing else:
{{
  "questions": [
    {{
      "question": "...",
      "options": {{
        "A": "...",
        "B": "...",
        "C": "...",
        "D": "..."
      }},
      "correct_answer": "B",
      "explanation": "..."
    }}
  ]
}}"""


def validate_questions(questions: list) -> list:
    valid = []
    for q in questions:
        try:
            assert "question" in q and q["question"].strip()
            assert "options" in q and len(q["options"]) == 4
            assert "correct_answer" in q and q["correct_answer"] in ("A", "B", "C", "D")
            assert all(k in q["options"] for k in ("A", "B", "C", "D"))
            valid.append(q)
        except AssertionError:
            continue
    return valid


def generate_questions(topics: list, difficulty: str, num_questions: int, subject: str) -> list:
    client = _get_groq_client()
    prompt = build_prompt(topics, difficulty, num_questions, subject)

    for attempt in range(2):
        try:
            print(f"DEBUG: Groq MCQ generation attempt {attempt + 1}...")
            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                response_format={"type": "json_object"},
            )

            raw = response.choices[0].message.content.strip()
            json_match = re.search(r'\{.*\}', raw, re.DOTALL)
            if json_match:
                raw = json_match.group(0)

            data = json.loads(raw)
            questions = data.get("questions", [])
            valid = validate_questions(questions)

            if len(valid) >= num_questions:
                return valid[:num_questions]

        except Exception as e:
            if attempt == 1:
                raise ValueError(f"Groq MCQ generation failed: {str(e)}")

    return []


# ─────────────────────────────────────────────
# Study Notes Generation (Groq)
# ─────────────────────────────────────────────
def build_notes_prompt(topics: list, subject: str, style: str) -> str:
    topic_list = "\n".join(f"- {t}" for t in topics)

    style_guidance = {
        'exam': "Focus on high-yield facts, marking schemes, probable questions, and key definitions. Use bullet points and emphasize key exam points.",
        'detailed': "Act as a textbook author. Provide highly expansive, textbook-like detailed notes diving deeply into every specified topic AND explicitly breaking them down into expansive sub-topics.",
        'flashcard': "Structure the content STRICTLY as a series of Flashcards using clear formatting. Each flashcard should have a 'Front' (Question/Concept) and a 'Back' (Answer/Explanation).",
        'mindmap': "Create a textual mind map. Use heavily nested markdown bulleted lists to show hierarchical relationships between concepts. Do NOT use paragraphs, only hierarchical points.",
        'revision': "Provide an ultra-concise 'cheat sheet' style summary. Focus only on the absolute core points, formulas, critical concepts, and fast-flowing bullet points."
    }.get(style, "Provide detailed explanations.")

    mindmap_trigger = ""
    if style == 'mindmap':
        mindmap_trigger = f"\n- **Special Requirement**: Use progressive indentation (-, *, +) in markdown to represent depth. Start with the core topic as the highest level heading (`#`), then major branches as `##`, and heavily nest bullet points under them."

    structural_rules = {
        'exam': """
# Exam Study Guide

## 1. Syllabus Overview
(A high-level map of how these topics appear in exams)

## 2. Key Concepts & Marking Points
(For each topic, provide the exact facts examiners look for in bullet points)

## 3. High-Probability Questions
(List 3-5 high-probability exam questions with 'Model Answer' bullet points)

## 4. Common Pitfalls
(Where students usually lose marks)

## 5. Exam Tips
(Tactical advice for answering questions on these topics)""",

        'detailed': """
# Comprehensive Textbook Study Notes

## 1. Chapter Introduction
(Deep context and foundational importance of the topics)

## 2. Exhaustive Topic Breakdown
(For EVERY single topic provided, you MUST create a massive section. Within EACH topic section, you MUST break it down into multiple SUB-TOPICS. Write expansive, textbook-level explanations for every sub-topic.)

## 3. Case Studies & Real-World Proofs
(Detailed examples, use cases, or theoretical models illuminating the sub-topics)

## 4. Advanced Critical Analysis
(Nuanced discussion of the concept's implications and edge-cases)

## 5. Chapter Summary
(A brief conclusion and pointers for mastery)""",

        'flashcard': """
# Flashcard Deck

## 1. Core Concepts Deck
(Use this exact format for each card:)
**Front**: [Question or Concept]
**Back**: [Concise, punchy answer or definition]
---
(Repeat for at least 10 core concepts)

## 2. Advanced Application Deck
(Same Front/Back format for deeper questions)
---

## 3. Mnemonic Corner
(Create 3-5 mnemonics for the hardest parts to memorize)""",

        'mindmap': """
# Mind Map: Core Concept Hub

## Branch 1: [Major Topic Name]
- Core Idea
  - Sub-detail
    - Fine detail
    - Fine detail
  - Sub-detail
- Core Idea 2

## Branch 2: [Major Topic Name]
(Continue the strictly nested list format. Do not write paragraphs)

## Connection Insights
(Brief notes on how different topics relate to each other)""",

        'revision': """
# Quick Revision Cheat Sheet

## The 'Essentials'
(Ultra-condensed bullet points of must-know facts)

## Formulas & Definitions
(List out explicitly)

## Quick-Reference Comparisons
(Use markdown tables for rapid viewing of differences between concepts)

## Final Recall
(3 bullet points that must be memorized above all else)"""
    }.get(style, "1. Introduction\n2. Topic Breakdown\n3. Summary Table\n4. Key Takeaways")

    return f"""You are an elite academic tutor and content creator specialized in {subject}.
Your task is to generate {style.upper()} style study notes for:
{topic_list}

Style Goals: {style_guidance}

REQUIRED STRUCTURE for this {style.upper()} session:
(Replicate the headings and structure below, filling in the content)
{structural_rules}
{mindmap_trigger}

Visual Aid Integration:
- You MUST include 2-3 visual illustration requests using exactly the format `[Diagram Suggestion: Detailed description of the image or diagram you want]`.
- We dynamically filter these to Unsplash. Make the descriptions descriptive, abstract, and search-friendly (e.g., `[Diagram Suggestion: neural network nodes glowing, 3d render]`).
- CRITICAL: Add "english text only" OR "no text" to EVERY diagram suggestion. Unsplash often returns images with foreign languages if you do not specify. We strictly want English content or entirely abstract graphics.
- For Flashcards, occasionally include a `[Diagram Suggestion: ...]` on the Back of the card to make it highly visual.

Format everything in clean, professional Markdown. Use formatting like bold (`**`), italics (`*`), code blocks (` ``` `), blockquotes (`>`), and tables to make it visually engaging. Do NOT include any preamble or extra conversational text. Start directly with the content.
"""


def generate_study_notes(topics: list, subject: str, style: str = 'detailed') -> str:
    client = _get_groq_client()
    prompt = build_notes_prompt(topics, subject, style)

    try:
        print("DEBUG: Generating study notes via Groq...")
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )

        content = response.choices[0].message.content.strip()

        # Strip any accidental markdown wrapper
        if content.startswith("```"):
            content = re.sub(r'^```(?:markdown|json|html|csv)?\n?', '', content)
            content = re.sub(r'\n?```$', '', content)
        content = content.strip()

        # Replace [Diagram Suggestion: ...] tags with real Unsplash images
        suggestions = re.findall(r'\[Diagram Suggestion:\s*\[?(.*?)\]?\]', content)
        for suggestion in suggestions:
            image_url = fetch_unsplash_image(suggestion)
            if image_url:
                pattern = r'\[Diagram Suggestion:\s*\[?' + re.escape(suggestion) + r'\]?\]'
                markdown_image = f"\n\n![{suggestion}]({image_url})\n*Image: {textwrap.shorten(suggestion, width=80, placeholder='...')} — via Unsplash*\n\n"
                content = re.sub(pattern, markdown_image, content)

        return content

    except Exception as e:
        raise ValueError(f"Groq Study Notes generation failed: {str(e)}")


# ─────────────────────────────────────────────
# Video Generation (MoviePy)
# ─────────────────────────────────────────────
def generate_topic_video(topics: list, subject: str, output_path: str) -> str:
    """
    Generates a slideshow-style MP4 video for the given topics using MoviePy.
    Each topic gets a dedicated slide with a background image from Unsplash
    and a text overlay. Returns the path of the saved video.
    """
    try:
        from moviepy.editor import (
            ImageClip, TextClip, CompositeVideoClip,
            concatenate_videoclips, ColorClip
        )
        from PIL import Image, ImageDraw, ImageFont
        import numpy as np
        import tempfile

        media_dir = Path(settings.MEDIA_ROOT) / "videos"
        media_dir.mkdir(parents=True, exist_ok=True)

        clips = []
        slide_duration = 5  # seconds per topic slide

        # ── Title slide ──────────────────────────────────────────────────
        title_img = _make_text_slide(
            title=subject,
            subtitle=" | ".join(topics),
            bg_color=(15, 23, 42),       # slate-900
            title_color=(139, 92, 246),  # violet-500
        )
        title_clip = ImageClip(np.array(title_img)).set_duration(slide_duration)
        clips.append(title_clip)

        # ── One slide per topic ──────────────────────────────────────────
        for topic in topics:
            # Fetch background image from Unsplash, requesting abstract/no-text to prevent foreign languages
            img_url = fetch_unsplash_image(f"{subject} {topic} abstract background no text")
            bg_img = _fetch_image_as_pil(img_url)

            # Overlay a dark, semi-transparent panel with topic text
            slide_img = _overlay_text_on_image(bg_img, topic, subject)
            clip = ImageClip(np.array(slide_img)).set_duration(slide_duration)
            clips.append(clip)

        # ── Outro slide ──────────────────────────────────────────────────
        outro_img = _make_text_slide(
            title="Happy Studying! 🎓",
            subtitle=f"{subject} · {len(topics)} topics covered",
            bg_color=(15, 23, 42),
            title_color=(52, 211, 153),  # emerald-400
        )
        outro_clip = ImageClip(np.array(outro_img)).set_duration(3)
        clips.append(outro_clip)

        # ── Concatenate & write ──────────────────────────────────────────
        final_video = concatenate_videoclips(clips, method="compose")
        video_path = str(media_dir / Path(output_path).name)
        final_video.write_videofile(
            video_path,
            fps=24,
            codec="libx264",
            audio=False,
            logger=None
        )
        print(f"DEBUG: Video saved to {video_path}")
        return video_path

    except ImportError:
        raise ValueError("MoviePy is not installed. Run: pip install moviepy")
    except Exception as e:
        raise ValueError(f"Video generation failed: {str(e)}")


def _make_text_slide(title: str, subtitle: str, bg_color: tuple, title_color: tuple) -> "Image":
    """Creates a 1280x720 PIL Image with a title and subtitle for a slide."""
    from PIL import Image, ImageDraw, ImageFont
    W, H = 1280, 720
    img = Image.new("RGB", (W, H), bg_color)
    draw = ImageDraw.Draw(img)

    # Try to use a nice font, fallback to default
    try:
        font_title = ImageFont.truetype("arial.ttf", 64)
        font_sub = ImageFont.truetype("arial.ttf", 32)
    except Exception:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    # Draw title
    draw.text((W // 2, H // 2 - 60), title, fill=title_color, font=font_title, anchor="mm")
    # Draw subtitle
    draw.text((W // 2, H // 2 + 60), subtitle, fill=(148, 163, 184), font=font_sub, anchor="mm")
    return img


def _fetch_image_as_pil(url: str) -> "Image":
    """Downloads an image from a URL and returns as a 1280x720 PIL Image."""
    from PIL import Image
    import io
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        img = Image.open(io.BytesIO(resp.content)).convert("RGB")
        img = img.resize((1280, 720), Image.LANCZOS)
        return img
    except Exception:
        from PIL import Image
        return Image.new("RGB", (1280, 720), (15, 23, 42))


def _overlay_text_on_image(bg: "Image", topic: str, subject: str) -> "Image":
    """Overlays a semi-transparent panel with topic title on a background image."""
    from PIL import Image, ImageDraw, ImageFont
    import numpy as np

    overlay = bg.copy()
    draw = ImageDraw.Draw(overlay)
    W, H = overlay.size

    # Semi-transparent panel at the bottom third
    panel = Image.new("RGBA", (W, H // 3), (0, 0, 0, 180))
    overlay.paste(Image.fromarray(np.array(panel)[:, :, :3]), (0, H * 2 // 3))

    try:
        font_topic = ImageFont.truetype("arial.ttf", 52)
        font_sub = ImageFont.truetype("arial.ttf", 28)
    except Exception:
        font_topic = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    draw.text((W // 2, H * 2 // 3 + 50), topic, fill=(255, 255, 255), font=font_topic, anchor="mm")
    draw.text((W // 2, H * 2 // 3 + 110), subject, fill=(139, 92, 246), font=font_sub, anchor="mm")

    return overlay
