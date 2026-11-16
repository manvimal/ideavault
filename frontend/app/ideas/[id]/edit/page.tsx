"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import FormattingToolbar from "@/components/ideas/FormattingToolbar";
import { createImagePasteHandler } from "@/lib/imagePaste";
import { Pencil, Sparkles } from "lucide-react";

export default function EditIdeaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const handlePaste = createImagePasteHandler(textareaRef, content, setContent, setUploadingImage);

  useEffect(() => {
    api
      .getIdea(params.id)
      .then((idea) => {
        setTitle(idea.title);
        setContent(idea.content);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateIdea(params.id, title, content);
      router.push(`/ideas/${params.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="mx-auto max-w-2xl animate-fade-in rounded-3xl border border-brand-100 bg-white p-8 shadow-soft">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-card">
          <Pencil size={18} />
        </span>
        <h1 className="text-xl font-bold text-slate-900">Edit Idea</h1>
      </div>
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Title</label>
          <input
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
          />
          {uploadingImage && <p className="mt-1 text-xs text-brand-500">Uploading image…</p>}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="self-start rounded-full bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
