import re
from typing import Any, Dict, List, Optional
from pathlib import Path

from app.config import settings

HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
BULLET_RE = re.compile(r"^\s*[-*]\s+(.*)$")
NUMBERED_RE = re.compile(r"^\s*\d+\.\s+(.*)$")
QUOTE_RE = re.compile(r"^>\s?(.*)$")
HR_RE = re.compile(r"^(---|\*\*\*)\s*$")
IMAGE_RE = re.compile(r"^!\[(.*?)\]\((.*?)\)$")
INLINE_RE = re.compile(r"(\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*|`(.+?)`)")
UPLOAD_URL_RE = re.compile(r"^/api/uploads/([\w.-]+)$")


def _is_block_start(line: str) -> bool:
    stripped = line.strip()
    return bool(
        HEADING_RE.match(line)
        or BULLET_RE.match(line)
        or NUMBERED_RE.match(line)
        or QUOTE_RE.match(line)
        or HR_RE.match(stripped)
        or IMAGE_RE.match(stripped)
    )


def parse_blocks(content: str) -> List[Dict[str, Any]]:
    """Split idea content into block-level elements (headings, lists, quotes, images, paragraphs)."""
    lines = content.split("\n")
    blocks: List[Dict[str, Any]] = []
    i = 0
    n = len(lines)

    while i < n:
        line = lines[i]
        if not line.strip():
            i += 1
            continue

        heading = HEADING_RE.match(line)
        if heading:
            blocks.append({"type": "heading", "level": len(heading.group(1)), "text": heading.group(2)})
            i += 1
            continue

        if HR_RE.match(line.strip()):
            blocks.append({"type": "hr"})
            i += 1
            continue

        image = IMAGE_RE.match(line.strip())
        if image:
            blocks.append({"type": "image", "alt": image.group(1), "url": image.group(2)})
            i += 1
            continue

        if BULLET_RE.match(line):
            items = []
            while i < n and BULLET_RE.match(lines[i]):
                items.append(BULLET_RE.match(lines[i]).group(1))
                i += 1
            blocks.append({"type": "bullet_list", "items": items})
            continue

        if NUMBERED_RE.match(line):
            items = []
            while i < n and NUMBERED_RE.match(lines[i]):
                items.append(NUMBERED_RE.match(lines[i]).group(1))
                i += 1
            blocks.append({"type": "numbered_list", "items": items})
            continue

        if QUOTE_RE.match(line):
            items = []
            while i < n and QUOTE_RE.match(lines[i]):
                items.append(QUOTE_RE.match(lines[i]).group(1))
                i += 1
            blocks.append({"type": "blockquote", "items": items})
            continue

        para_lines = []
        while i < n and lines[i].strip() and not _is_block_start(lines[i]):
            para_lines.append(lines[i])
            i += 1
        blocks.append({"type": "paragraph", "text": " ".join(para_lines)})

    return blocks


def parse_inline(text: str) -> List[Dict[str, Any]]:
    """Split a line of text into runs annotated with bold/italic/underline/code."""
    tokens: List[Dict[str, Any]] = []
    last = 0
    for match in INLINE_RE.finditer(text):
        if match.start() > last:
            tokens.append({"text": text[last : match.start()]})
        bold, underline, italic, code = match.group(2), match.group(3), match.group(4), match.group(5)
        if bold is not None:
            tokens.append({"text": bold, "bold": True})
        elif underline is not None:
            tokens.append({"text": underline, "underline": True})
        elif italic is not None:
            tokens.append({"text": italic, "italic": True})
        elif code is not None:
            tokens.append({"text": code, "code": True})
        last = match.end()
    if last < len(text):
        tokens.append({"text": text[last:]})
    return tokens


def resolve_upload_path(url: str) -> Optional[Path]:
    """Resolve a `/api/uploads/<file>` reference to a safe local path, rejecting anything else."""
    match = UPLOAD_URL_RE.match(url)
    if not match:
        return None
    path = (settings.uploads_dir / match.group(1)).resolve()
    if path.parent != settings.uploads_dir.resolve() or not path.exists():
        return None
    return path
