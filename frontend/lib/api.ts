import { BusinessCaseJob, Idea, IdeaSummary, MindmapNode } from "@/types";

const BASE = "/api/ideas";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    let detail = body;
    try {
      const parsed = JSON.parse(body);
      if (typeof parsed.detail === "string") detail = parsed.detail;
    } catch {}
    throw new Error(detail || `Request failed (${res.status})`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}

export const api = {
  listIdeas: () => request<IdeaSummary[]>(""),
  getIdea: (id: string) => request<Idea>(`/${id}`),
  createIdea: (title: string, content: string) =>
    request<Idea>("", { method: "POST", body: JSON.stringify({ title, content }) }),
  updateIdea: (id: string, title: string, content: string) =>
    request<Idea>(`/${id}`, { method: "PUT", body: JSON.stringify({ title, content }) }),
  deleteIdea: (id: string) => request<void>(`/${id}`, { method: "DELETE" }),
  startBusinessCase: (id: string) => request<BusinessCaseJob>(`/${id}/business-case`, { method: "POST" }),
  getBusinessCaseJob: async (id: string): Promise<BusinessCaseJob | null> => {
    const res = await fetch(`${BASE}/${id}/business-case`, { cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Could not load generation status (${res.status})`);
    return res.json();
  },
  cancelBusinessCase: (id: string) => request<BusinessCaseJob>(`/${id}/business-case`, { method: "DELETE" }),
  getMindmap: (id: string) => request<MindmapNode>(`/${id}/mindmap`),
  updateStrategyTool: (id: string, toolKey: string, data: Record<string, string>) =>
    request<Idea>(`/${id}/strategy/${toolKey}`, {
      method: "PUT",
      body: JSON.stringify({ data }),
    }),
  exportUrl: (id: string, format: "markdown" | "word" | "pdf") => `${BASE}/${id}/export/${format}`,
  uploadImage: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: formData });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Image upload failed (${res.status}): ${detail}`);
    }
    return res.json();
  },
};
