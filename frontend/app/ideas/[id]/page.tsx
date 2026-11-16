"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { BusinessCaseJob, Idea, MindmapNode } from "@/types";
import MindmapView from "@/components/ideas/MindmapView";
import StrategyTools from "@/components/strategy/StrategyTools";
import { renderMarkdown } from "@/lib/markdown";
import { Compass, FileDown, FileText, LoaderCircle, Network, Pencil, ScrollText, Sparkles, X } from "lucide-react";

type Tab = "document" | "mindmap" | "strategy";

const POLL_INTERVAL_MS = 2000;

const isActive = (job: BusinessCaseJob | null) => job?.status === "queued" || job?.status === "running";

const formatElapsed = (seconds: number) => {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
};

const phaseMessage = (job: BusinessCaseJob) => {
  if (job.cancel_requested) return "Cancelling…";
  if (job.status === "queued") return "Waiting for another business case to finish.";
  if (job.generated_tokens === 0) return "The model is reading the idea and preparing its answer.";
  return "The model is writing the business case.";
};

export default function IdeaViewerPage() {
  const params = useParams<{ id: string }>();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [mindmap, setMindmap] = useState<MindmapNode | null>(null);
  const [tab, setTab] = useState<Tab>("document");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<BusinessCaseJob | null>(null);
  const [starting, setStarting] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getIdea(params.id)
      .then(setIdea)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    api
      .getBusinessCaseJob(params.id)
      .then(setJob)
      .catch((err) => setGenerationError(err.message));
  }, [params.id]);

  // Re-armed after every poll result, so polling stops once the job is no longer active.
  useEffect(() => {
    if (!isActive(job)) return;
    const timer = window.setTimeout(async () => {
      try {
        const next = await api.getBusinessCaseJob(params.id);
        if (next === null) {
          setGenerationError("The generation status is no longer available. The server may have restarted; please try again.");
        } else {
          setGenerationError(null);
          if (next.status === "completed") setIdea(await api.getIdea(params.id));
        }
        setJob(next);
      } catch {
        setGenerationError("Lost contact with the server. Retrying…");
        setJob((current) => (current ? { ...current } : current));
      }
    }, POLL_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [job, params.id]);

  const loadMindmap = () => {
    setTab("mindmap");
    if (!mindmap) {
      api.getMindmap(params.id).then(setMindmap);
    }
  };

  const generateBusinessCase = async () => {
    if (!idea || starting || isActive(job)) return;
    if (idea.ai_generated_description && !window.confirm("Replace the existing AI-generated business case?")) return;
    setGenerationError(null);
    setStarting(true);
    try {
      setJob(await api.startBusinessCase(idea.id));
      setTab("document");
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : "Business case generation could not be started.");
    } finally {
      setStarting(false);
    }
  };

  const cancelBusinessCase = async () => {
    try {
      setJob(await api.cancelBusinessCase(params.id));
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : "Business case generation could not be cancelled.");
    }
  };

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (error || !idea) return <p className="text-red-600">{error || "Idea not found"}</p>;

  const generating = starting || isActive(job);

  const tabs: { key: Tab; label: string; icon: typeof ScrollText; onClick: () => void }[] = [
    { key: "document", label: "Document View", icon: ScrollText, onClick: () => setTab("document") },
    { key: "mindmap", label: "Mindmap", icon: Network, onClick: loadMindmap },
    { key: "strategy", label: "Strategy Tools", icon: Compass, onClick: () => setTab("strategy") },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-brand-100 bg-gradient-to-br from-white to-brand-50 p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{idea.title}</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={generateBusinessCase}
            disabled={generating}
            className="flex min-h-9 items-center gap-2 rounded-full bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-wait disabled:opacity-60"
          >
            {generating ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {generating ? "Generating..." : idea.ai_generated_description ? "Regenerate business case" : "Generate business case"}
          </button>
          <Link
            href={`/ideas/${idea.id}/edit`}
            title="Edit"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 shadow-soft transition-colors hover:bg-slate-100"
          >
            <Pencil size={16} />
          </Link>
          <a
            href={api.exportUrl(idea.id, "word")}
            title="Export to Word"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700 transition-colors hover:bg-blue-100"
          >
            <FileDown size={16} />
          </a>
          <a
            href={api.exportUrl(idea.id, "pdf")}
            title="Export to PDF"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-700 transition-colors hover:bg-rose-100"
          >
            <FileDown size={16} />
          </a>
          <a
            href={api.exportUrl(idea.id, "markdown")}
            title="Export to Markdown"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            <FileText size={16} />
          </a>
        </div>
      </div>

      {generationError && <p role="alert" className="mb-4 text-sm text-red-600">{generationError}</p>}

      {job && isActive(job) && (
        <div className="mb-6 border-l-4 border-brand-500 bg-brand-50 px-4 py-3 text-sm text-slate-700">
          <div className="flex items-start gap-3">
            <LoaderCircle size={18} className="mt-0.5 shrink-0 animate-spin text-brand-600" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">Generating business case</p>
              <p role="status">{phaseMessage(job)}</p>
              <p aria-live="off" className="mt-1 text-slate-500">
                Elapsed {formatElapsed(job.elapsed_seconds)}
                {job.generated_tokens > 0 && ` · about ${job.generated_tokens} of up to ${job.max_tokens} tokens written`}
              </p>
              <p className="mt-1 text-slate-500">Generation continues if you leave or refresh this page.</p>
            </div>
            <button
              type="button"
              onClick={cancelBusinessCase}
              disabled={job.cancel_requested}
              className="flex shrink-0 items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              <X size={14} /> Cancel
            </button>
          </div>
          {job.partial_content && (
            <div className="mt-3 max-h-80 overflow-y-auto border-t border-brand-100 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Live preview (not saved yet)</p>
              <article className="font-serif text-slate-800">{renderMarkdown(job.partial_content)}</article>
            </div>
          )}
        </div>
      )}

      {job?.status === "failed" && <p role="alert" className="mb-4 text-sm text-red-600">Business case generation failed: {job.error}</p>}
      {job?.status === "cancelled" && (
        <p role="status" className="mb-4 text-sm text-slate-600">Business case generation was cancelled. Any existing business case was kept.</p>
      )}
      {job?.status === "completed" && job.truncated && (
        <p role="status" className="mb-4 text-sm text-amber-700">
          The business case reached the {job.max_tokens}-token limit and may be incomplete.
        </p>
      )}

      <div className="mb-6 flex w-fit max-w-full flex-wrap gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-soft">
        {tabs.map(({ key, label, icon: Icon, onClick }) => (
          <button
            key={key}
            onClick={onClick}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === key ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-card" : "text-slate-500 hover:text-brand-600"
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === "document" && (
        <div className="paper-sheet mx-auto max-w-3xl animate-fade-in rounded-3xl border border-slate-100 p-10">
          <article className="font-serif text-slate-800">
            {idea.content ? renderMarkdown(idea.content) : "No content yet. Click Edit to add your findings."}
          </article>
          {idea.ai_generated_description && (
            <section className="mt-10 border-t border-slate-200 pt-8">
              <h2 className="mb-2 text-xl font-bold text-slate-900">AI-generated business case</h2>
              <p className="mb-6 text-sm text-slate-500">AI-generated analysis. Verify assumptions, figures and local regulations before making decisions.</p>
              <article className="font-serif text-slate-800">{renderMarkdown(idea.ai_generated_description)}</article>
            </section>
          )}
        </div>
      )}

      {tab === "mindmap" && (mindmap ? <MindmapView root={mindmap} /> : <p className="text-slate-500">Generating mindmap…</p>)}

      {tab === "strategy" && <StrategyTools ideaId={idea.id} strategicTools={idea.strategic_tools} />}
    </div>
  );
}
