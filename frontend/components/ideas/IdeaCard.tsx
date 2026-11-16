import Link from "next/link";
import { IdeaSummary } from "@/types";
import { api } from "@/lib/api";
import { Eye, FileDown, FileText, Pencil, Trash2 } from "lucide-react";

const iconButton =
  "flex h-9 w-9 items-center justify-center rounded-full transition-colors";

export default function IdeaCard({
  idea,
  onDelete,
}: {
  idea: IdeaSummary;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="group animate-fade-in rounded-2xl border border-slate-100 bg-white p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900 transition-colors group-hover:text-brand-700">{idea.title}</h2>
        <button
          onClick={() => onDelete(idea.id)}
          title="Delete"
          className="shrink-0 rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={16} />
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-500 line-clamp-2">{idea.snippet || "No content yet."}</p>
      <p className="mt-2 text-xs text-slate-400">Updated {new Date(idea.updated_at).toLocaleString()}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={`/ideas/${idea.id}`} title="View" className={`${iconButton} bg-brand-600 text-white hover:bg-brand-700`}>
          <Eye size={16} />
        </Link>
        <Link
          href={`/ideas/${idea.id}/edit`}
          title="Edit"
          className={`${iconButton} bg-slate-100 text-slate-700 hover:bg-slate-200`}
        >
          <Pencil size={16} />
        </Link>
        <a
          href={api.exportUrl(idea.id, "word")}
          title="Export to Word"
          className={`${iconButton} bg-blue-50 text-blue-700 hover:bg-blue-100`}
        >
          <FileDown size={16} />
        </a>
        <a
          href={api.exportUrl(idea.id, "pdf")}
          title="Export to PDF"
          className={`${iconButton} bg-rose-50 text-rose-700 hover:bg-rose-100`}
        >
          <FileDown size={16} />
        </a>
        <a
          href={api.exportUrl(idea.id, "markdown")}
          title="Export to Markdown"
          className={`${iconButton} bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
        >
          <FileText size={16} />
        </a>
      </div>
    </div>
  );
}
