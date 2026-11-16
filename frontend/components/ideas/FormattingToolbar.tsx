"use client";

import { RefObject } from "react";

type WrapAction = { type: "wrap"; prefix: string; suffix?: string; placeholder: string };
type LineAction = { type: "line"; prefix: string };
type BlockAction = { type: "block"; text: string };
type ToolAction = WrapAction | LineAction | BlockAction;

const TOOLS: { label: string; title: string; action: ToolAction }[] = [
  { label: "B", title: "Bold", action: { type: "wrap", prefix: "**", placeholder: "bold text" } },
  { label: "I", title: "Italic", action: { type: "wrap", prefix: "*", placeholder: "italic text" } },
  { label: "U", title: "Underline", action: { type: "wrap", prefix: "__", placeholder: "underlined text" } },
  { label: "</>", title: "Inline code", action: { type: "wrap", prefix: "`", placeholder: "code" } },
  { label: "H1", title: "Heading 1", action: { type: "line", prefix: "# " } },
  { label: "H2", title: "Heading 2", action: { type: "line", prefix: "## " } },
  { label: "H3", title: "Heading 3", action: { type: "line", prefix: "### " } },
  { label: "• List", title: "Bullet list", action: { type: "line", prefix: "- " } },
  { label: "1. List", title: "Numbered list", action: { type: "line", prefix: "1. " } },
  { label: "❝", title: "Quote", action: { type: "line", prefix: "> " } },
  { label: "―", title: "Horizontal rule", action: { type: "block", text: "\n---\n" } },
];

export default function FormattingToolbar({
  textareaRef,
  value,
  onChange,
}: {
  textareaRef: RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (next: string) => void;
}) {
  const applyWrap = (prefix: string, suffix: string, placeholder: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + prefix + selected + suffix + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start + prefix.length;
      el.selectionEnd = start + prefix.length + selected.length;
    });
  };

  const applyLinePrefix = (prefix: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + prefix.length;
    });
  };

  const applyBlock = (text: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const next = value.slice(0, start) + text + value.slice(start);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + text.length;
    });
  };

  const runAction = (action: ToolAction) => {
    if (action.type === "wrap") applyWrap(action.prefix, action.suffix ?? action.prefix, action.placeholder);
    else if (action.type === "line") applyLinePrefix(action.prefix);
    else applyBlock(action.text);
  };

  return (
    <div className="mb-1 flex flex-wrap gap-1 rounded-t-xl border border-b-0 border-slate-200 bg-slate-50 p-2">
      {TOOLS.map((tool) => (
        <button
          key={tool.title}
          type="button"
          title={tool.title}
          onClick={() => runAction(tool.action)}
          className="min-w-[2rem] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
        >
          {tool.label}
        </button>
      ))}
    </div>
  );
}
