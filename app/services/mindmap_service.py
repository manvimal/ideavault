import re
from typing import Any, Dict, List

HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
BULLET_RE = re.compile(r"^\s*[-*]\s+(.*)$")


def _new_node(name: str) -> Dict[str, Any]:
    return {"name": name, "children": []}


def build_mindmap(title: str, content: str) -> Dict[str, Any]:
    """Turn markdown-ish idea content into a hierarchical mindmap tree.

    Headings (#, ##, ###...) become nested branches; bullet list items
    become leaf nodes under the nearest heading (or under the root).
    """
    root = _new_node(title or "Idea")
    # stack holds (level, node) where level 0 == root
    stack: List[tuple[int, Dict[str, Any]]] = [(0, root)]

    for raw_line in content.splitlines():
        line = raw_line.rstrip()
        if not line.strip():
            continue

        heading_match = HEADING_RE.match(line)
        if heading_match:
            level = len(heading_match.group(1))
            text = heading_match.group(2).strip()
            node = _new_node(text)
            while stack and stack[-1][0] >= level:
                stack.pop()
            parent = stack[-1][1] if stack else root
            parent["children"].append(node)
            stack.append((level, node))
            continue

        bullet_match = BULLET_RE.match(line)
        if bullet_match:
            text = bullet_match.group(1).strip()
            parent = stack[-1][1] if stack else root
            parent["children"].append(_new_node(text))
            continue

        # Plain paragraph text: attach as a leaf under current branch.
        parent = stack[-1][1] if stack else root
        parent["children"].append(_new_node(line.strip()))

    return root
