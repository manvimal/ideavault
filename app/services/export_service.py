import io
from xml.sax.saxutils import escape

from docx import Document
from docx.shared import Inches
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Image as RLImage
from reportlab.platypus import ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer

from app.models.idea import Idea
from app.services.markdown_parser import parse_blocks, parse_inline, resolve_upload_path


def to_markdown(idea: Idea) -> bytes:
    lines = [f"# {idea.title}", "", idea.content, ""]
    if idea.ai_generated_description:
        lines.extend(["## AI-generated business case", "", idea.ai_generated_description, ""])
    for tool_key, data in idea.strategic_tools.items():
        if not data:
            continue
        lines.append(f"## {tool_key.replace('_', ' ').title()}")
        for field, value in data.items():
            lines.append(f"**{field}**: {value}")
        lines.append("")
    return "\n".join(lines).encode("utf-8")


def _add_inline_runs(paragraph, text: str) -> None:
    for token in parse_inline(text):
        run = paragraph.add_run(token["text"])
        run.bold = token.get("bold", False)
        run.italic = token.get("italic", False)
        run.underline = token.get("underline", False)
        if token.get("code"):
            run.font.name = "Consolas"


def _render_blocks_docx(document: Document, blocks: list[dict]) -> None:
    for block in blocks:
        if block["type"] == "heading":
            paragraph = document.add_heading("", level=min(block["level"], 9))
            _add_inline_runs(paragraph, block["text"])
        elif block["type"] == "paragraph":
            _add_inline_runs(document.add_paragraph(), block["text"])
        elif block["type"] == "bullet_list":
            for item in block["items"]:
                _add_inline_runs(document.add_paragraph(style="List Bullet"), item)
        elif block["type"] == "numbered_list":
            for item in block["items"]:
                _add_inline_runs(document.add_paragraph(style="List Number"), item)
        elif block["type"] == "blockquote":
            for item in block["items"]:
                _add_inline_runs(document.add_paragraph(style="Intense Quote"), item)
        elif block["type"] == "hr":
            document.add_paragraph("―" * 24)
        elif block["type"] == "image":
            path = resolve_upload_path(block["url"])
            if path:
                document.add_picture(str(path), width=Inches(4))


def to_docx(idea: Idea) -> bytes:
    document = Document()
    document.add_heading(idea.title, level=0)
    _render_blocks_docx(document, parse_blocks(idea.content))

    if idea.ai_generated_description:
        document.add_heading("AI-generated business case", level=1)
        _render_blocks_docx(document, parse_blocks(idea.ai_generated_description))

    for tool_key, data in idea.strategic_tools.items():
        if not data:
            continue
        document.add_heading(tool_key.replace("_", " ").title(), level=2)
        for field, value in data.items():
            paragraph = document.add_paragraph()
            paragraph.add_run(f"{field}: ").bold = True
            _add_inline_runs(paragraph, value)

    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def _inline_to_markup(text: str) -> str:
    parts = []
    for token in parse_inline(text):
        chunk = escape(token["text"])
        if token.get("bold"):
            chunk = f"<b>{chunk}</b>"
        if token.get("italic"):
            chunk = f"<i>{chunk}</i>"
        if token.get("underline"):
            chunk = f"<u>{chunk}</u>"
        if token.get("code"):
            chunk = f'<font face="Courier">{chunk}</font>'
        parts.append(chunk)
    return "".join(parts)


HEADING_STYLES = {1: "Heading1", 2: "Heading2", 3: "Heading3", 4: "Heading4", 5: "Heading5", 6: "Heading6"}


def _render_blocks_pdf(blocks: list[dict], styles) -> list:
    story: list = []
    for block in blocks:
        if block["type"] == "heading":
            style = styles[HEADING_STYLES.get(block["level"], "Heading6")]
            story.append(Paragraph(_inline_to_markup(block["text"]), style))
            story.append(Spacer(1, 6))
        elif block["type"] == "paragraph":
            story.append(Paragraph(_inline_to_markup(block["text"]), styles["BodyText"]))
            story.append(Spacer(1, 6))
        elif block["type"] in ("bullet_list", "numbered_list"):
            items = [ListItem(Paragraph(_inline_to_markup(item), styles["BodyText"])) for item in block["items"]]
            bullet_type = "bullet" if block["type"] == "bullet_list" else "1"
            story.append(ListFlowable(items, bulletType=bullet_type))
            story.append(Spacer(1, 6))
        elif block["type"] == "blockquote":
            for item in block["items"]:
                story.append(Paragraph(f"<i>{_inline_to_markup(item)}</i>", styles["BodyText"]))
            story.append(Spacer(1, 6))
        elif block["type"] == "hr":
            story.append(Spacer(1, 12))
        elif block["type"] == "image":
            path = resolve_upload_path(block["url"])
            if path:
                story.append(RLImage(str(path), width=300, height=200, kind="proportional"))
                story.append(Spacer(1, 6))
    return story


def to_pdf(idea: Idea) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=LETTER)
    styles = getSampleStyleSheet()
    story = [Paragraph(escape(idea.title), styles["Title"]), Spacer(1, 12)]
    story.extend(_render_blocks_pdf(parse_blocks(idea.content), styles))

    if idea.ai_generated_description:
        story.append(Spacer(1, 12))
        story.append(Paragraph("AI-generated business case", styles["Heading1"]))
        story.extend(_render_blocks_pdf(parse_blocks(idea.ai_generated_description), styles))

    for tool_key, data in idea.strategic_tools.items():
        if not data:
            continue
        story.append(Spacer(1, 12))
        story.append(Paragraph(escape(tool_key.replace("_", " ").title()), styles["Heading2"]))
        for field, value in data.items():
            story.append(Paragraph(f"<b>{escape(field)}</b>: {_inline_to_markup(value)}", styles["BodyText"]))

    doc.build(story)
    return buffer.getvalue()

