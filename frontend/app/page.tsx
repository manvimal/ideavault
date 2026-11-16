"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { IdeaSummary } from "@/types";
import IdeaCard from "@/components/ideas/IdeaCard";
import { Lightbulb, Plus, Search, Sparkles } from "lucide-react";

export default function HomePage() {
  const [ideas, setIdeas] = useState<IdeaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = () => {
    setLoading(true);
    api
      .listIdeas()
      .then(setIdeas)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this idea?")) return;
    await api.deleteIdea(id);
    load();
  };

  const filtered = useMemo(
    () =>
      ideas.filter(
        (idea) =>
          idea.title.toLowerCase().includes(query.toLowerCase()) ||
          idea.snippet.toLowerCase().includes(query.toLowerCase())
      ),
    [ideas, query]
  );

  return (
    <div>
      <div className="mb-8 flex flex-col gap-6 rounded-3xl border border-brand-100 bg-gradient-to-br from-white to-brand-50 p-8 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
            <Sparkles size={13} /> EdTech idea workspace
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">Your Ideas</h1>
          <p className="mt-1 text-slate-500">Capture findings, visualize them, and analyze them with strategy frameworks.</p>
        </div>
        <Link
          href="/ideas/new"
          className="flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          <Plus size={16} strokeWidth={2.5} /> New Idea
        </Link>
      </div>

      {ideas.length > 0 && (
        <div className="relative mb-6 max-w-sm">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ideas…"
            className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm shadow-soft transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
          />
        </div>
      )}

      {loading && <p className="text-slate-500">Loading ideas…</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && ideas.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-brand-200 bg-white/60 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
            <Lightbulb size={26} />
          </span>
          <p className="mt-4 text-slate-500">
            No ideas yet. Click <span className="font-medium text-brand-600">New Idea</span> to add your first one.
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {filtered.map((idea) => (
          <IdeaCard key={idea.id} idea={idea} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}
