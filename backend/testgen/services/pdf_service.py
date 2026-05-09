import io
import re
import os
from django.conf import settings
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from xml.sax.saxutils import escape


def generate_pdf(test) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            rightMargin=2*cm, leftMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("T", parent=styles["Heading1"], fontSize=18,
                                 textColor=colors.HexColor("#1e3a5f"),
                                 spaceAfter=6, alignment=TA_CENTER)
    subtitle_style = ParagraphStyle("S", parent=styles["Normal"], fontSize=11,
                                    textColor=colors.HexColor("#555555"),
                                    spaceAfter=4, alignment=TA_CENTER)
    question_style = ParagraphStyle("Q", parent=styles["Normal"], fontSize=11,
                                    textColor=colors.HexColor("#1a1a2e"),
                                    spaceBefore=10, spaceAfter=4, leading=16)
    option_style = ParagraphStyle("O", parent=styles["Normal"], fontSize=10,
                                  textColor=colors.HexColor("#333333"),
                                  leftIndent=20, spaceAfter=2, leading=14)
    answer_style = ParagraphStyle("A", parent=styles["Normal"], fontSize=9,
                                  textColor=colors.HexColor("#2e7d32"),
                                  leftIndent=20, spaceAfter=2, leading=12)
    explanation_style = ParagraphStyle("E", parent=styles["Normal"], fontSize=9,
                                       textColor=colors.HexColor("#666666"),
                                       leftIndent=20, spaceAfter=6, leading=12,
                                       fontName="Helvetica-Oblique")

    story = [
        Paragraph(escape(test.title), title_style),
        Paragraph(
            f"Subject: {escape(test.subject or 'N/A')} &nbsp;|&nbsp; Difficulty: {test.difficulty} &nbsp;|&nbsp; Questions: {test.questions.count()}",
            subtitle_style
        ),
        HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1e3a5f"), spaceAfter=12),
    ]

    for i, question in enumerate(test.questions.all(), 1):
        q_text = escape(question.question_text)
        story.append(Paragraph(f"<b>Q{i}. {q_text}</b>", question_style))
        for opt in question.options.all().order_by('label'):
            opt_text = escape(opt.text)
            story.append(Paragraph(f"&nbsp;&nbsp;{opt.label}.&nbsp; {opt_text}", option_style))
        story.append(Paragraph(f"<b>✓ Answer:</b> {question.correct_answer}", answer_style))
        if question.explanation:
            exp_text = escape(question.explanation)
            story.append(Paragraph(f"<i>Explanation: {exp_text}</i>", explanation_style))
        story.append(Spacer(1, 6))

    doc.build(story)
    return buffer.getvalue()


def generate_note_pdf(note) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            rightMargin=2*cm, leftMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)

    styles = getSampleStyleSheet()
    
    # Custom Styles for Notes
    n_title_style = ParagraphStyle("NT", parent=styles["Heading1"], fontSize=22,
                                  textColor=colors.HexColor("#6366f1"),
                                  spaceAfter=12, alignment=TA_LEFT)
    n_meta_style = ParagraphStyle("NM", parent=styles["Normal"], fontSize=10,
                                 textColor=colors.HexColor("#64748b"),
                                 spaceAfter=20)
    h2_style = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=14,
                             textColor=colors.HexColor("#1e293b"),
                             spaceBefore=16, spaceAfter=8, borderPadding=2)
    h3_style = ParagraphStyle("H3", parent=styles["Heading3"], fontSize=12,
                             textColor=colors.HexColor("#4338ca"),
                             spaceBefore=12, spaceAfter=6)
    body_style = ParagraphStyle("B", parent=styles["Normal"], fontSize=10,
                               textColor=colors.HexColor("#334155"),
                               leading=14, spaceAfter=8)
    li_style = ParagraphStyle("L", parent=styles["Normal"], fontSize=10,
                             textColor=colors.HexColor("#334155"),
                             leading=14, leftIndent=20, firstLineIndent=-10, spaceAfter=4)

    story = [
        Paragraph(escape(note.title), n_title_style),
        Paragraph(f"Subject: {escape(note.subject or 'N/A')} &nbsp;|&nbsp; Date: {note.created_at.strftime('%b %d, %Y')}", n_meta_style),
        HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0"), spaceAfter=20),
    ]

    # Simple Markdown Parser
    lines = note.content.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            story.append(Spacer(1, 6))
            continue

        # Image Handling
        # Format: ![Visual Aid: Description](http://localhost:8000/media/visual_aids/diagram_xxx.png)
        img_match = re.search(r'!\[.*?\]\((.*?)\)', line)
        if img_match:
            img_url = img_match.group(1)
            # Resolve to local path
            if '/media/visual_aids/' in img_url:
                filename = img_url.split('/')[-1]
                local_path = os.path.join(settings.MEDIA_ROOT, 'visual_aids', filename)
                if os.path.exists(local_path):
                    try:
                        img = Image(local_path, width=15*cm, height=10*cm, kind='proportional')
                        story.append(img)
                        story.append(Spacer(1, 12))
                        continue
                    except Exception:
                        pass # Fallback to text if image fails

        if line.startswith('# '):
            story.append(Paragraph(escape(line[2:]), n_title_style))
        elif line.startswith('## '):
            story.append(Paragraph(escape(line[3:]), h2_style))
        elif line.startswith('### '):
            story.append(Paragraph(escape(line[4:]), h3_style))
        elif line.startswith('- ') or line.startswith('* '):
            story.append(Paragraph(f"&bull; {escape(line[2:])}", li_style))
        elif line.startswith('1. '):
            story.append(Paragraph(escape(line), li_style)) # Simple numbered list mapping
        else:
            # Handle bold/italic markdown in body
            processed_body = escape(line)
            processed_body = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', processed_body)
            processed_body = re.sub(r'\*(.*?)\*', r'<i>\1</i>', processed_body)
            story.append(Paragraph(processed_body, body_style))

    doc.build(story)
    return buffer.getvalue()
