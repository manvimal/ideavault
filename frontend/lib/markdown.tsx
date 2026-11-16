import React from "react";

function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(!\[(.*?)\]\((.*?)\)|\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const [full, , imageAlt, imageUrl, bold, underline, italic, code] = match;
    if (imageUrl !== undefined) {
      // eslint-disable-next-line @next/next/no-img-element
      nodes.push(<img key={key++} src={imageUrl} alt={imageAlt} className="my-2 max-w-full rounded border border-slate-200" />);
    } else if (bold !== undefined) nodes.push(<strong key={key++}>{bold}</strong>);
    else if (underline !== undefined) nodes.push(<u key={key++}>{underline}</u>);
    else if (italic !== undefined) nodes.push(<em key={key++}>{italic}</em>);
    else if (code !== undefined)
      nodes.push(
        <code key={key++} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-sm">
          {code}
        </code>
      );
    lastIndex = match.index + full.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

const HEADING_SIZES = ["text-3xl", "text-2xl", "text-xl", "text-lg", "text-base", "text-sm"];

/** Render a lightweight markdown subset (headings, bold/italic/underline/code, lists, quotes, hr) as React nodes. */
export function renderMarkdown(content: string): React.ReactNode[] {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  const isBlockStart = (line: string) =>
    /^#{1,6}\s+/.test(line) ||
    /^\s*[-*]\s+/.test(line) ||
    /^\s*\d+\.\s+/.test(line) ||
    /^>\s?/.test(line) ||
    /^(---|\*\*\*)\s*$/.test(line.trim());

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;
      blocks.push(
        <Tag key={key++} className={`${HEADING_SIZES[level - 1]} mb-2 mt-6 font-semibold text-slate-900`}>
          {parseInline(heading[2])}
        </Tag>
      );
      i++;
      continue;
    }

    if (/^(---|\*\*\*)\s*$/.test(line.trim())) {
      blocks.push(<hr key={key++} className="my-4 border-slate-200" />);
      i++;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++} className="my-2 list-disc space-y-1 pl-6">
          {items.map((item, idx) => (
            <li key={idx}>{parseInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={key++} className="my-2 list-decimal space-y-1 pl-6">
          {items.map((item, idx) => (
            <li key={idx}>{parseInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    if (/^>\s?/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        items.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote key={key++} className="my-2 border-l-4 border-slate-300 pl-4 italic text-slate-600">
          {items.map((item, idx) => (
            <p key={idx}>{parseInline(item)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="my-2 leading-relaxed">
        {parseInline(paraLines.join(" "))}
      </p>
    );
  }

  return blocks;
}
