import { MindmapNode } from "@/types";

function TreeNode({ node, depth }: { node: MindmapNode; depth: number }) {
  const colors = [
    "bg-gradient-to-r from-brand-600 to-brand-500 text-white",
    "bg-emerald-100 text-emerald-900",
    "bg-amber-100 text-amber-900",
    "bg-sky-100 text-sky-900",
  ];
  const color = colors[Math.min(depth, colors.length - 1)];
  return (
    <li>
      <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium shadow-soft transition-transform hover:scale-105 ${color}`}>
        {node.name}
      </span>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child, idx) => (
            <TreeNode key={idx} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function MindmapView({ root }: { root: MindmapNode }) {
  return (
    <div className="animate-fade-in overflow-x-auto rounded-2xl border border-brand-100 bg-white p-6 shadow-soft">
      <ul className="mindmap-tree">
        <TreeNode node={root} depth={0} />
      </ul>
    </div>
  );
}
