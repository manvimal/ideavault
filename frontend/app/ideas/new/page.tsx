"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "@/lib/api";
import FormattingToolbar from "@/components/ideas/FormattingToolbar";
import { createImagePasteHandler } from "@/lib/imagePaste";
import { Lightbulb, Sparkles } from "lucide-react";

export default function NewIdeaPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const handlePaste = createImagePasteHandler(textareaRef, content, setContent, setUploadingImage);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    try {
      const idea = await api.createIdea(title, content);
      router.push(`/ideas/${idea.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl animate-fade-in rounded-3xl border border-brand-100 bg-white p-8 shadow-soft">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-card">
          <Lightbulb size={18} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-900">New Idea</h1>
          <p className="text-sm text-slate-400">Capture a spark before it fades</p>
        </div>
      </div>
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Title</label>
          <input
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Adaptive learning paths for K-12 math"
          />
        </div>
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            Findings / Notes
            <span className="flex items-center gap-1 text-xs font-normal text-slate-400">
              <Sparkles size={12} /> paste an image to embed it
            </span>
          </label>
          <FormattingToolbar textareaRef={textareaRef} value={content} onChange={setContent} />
          <textarea
            ref={textareaRef}
            className="h-64 w-full rounded-b-xl border border-slate-200 px-3.5 py-2.5 font-mono text-sm transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onPaste={handlePaste}
            placeholder={"# Problem\n- Students struggle with...\n\n# Solution\n- Adaptive engine that..."}
          />
          {uploadingImage && <p className="mt-1 text-xs text-brand-500">Uploading image…</p>}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="self-start rounded-full bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Idea"}
        </button>
      </form>
    </div>
  );
}
