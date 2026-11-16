"use client";

import { useEffect, useState } from "react";
import { STRATEGY_TOOLS } from "@/types";
import { api } from "@/lib/api";

export default function StrategyTools({
  ideaId,
  strategicTools,
}: {
  ideaId: string;
  strategicTools: Record<string, Record<string, string>>;
}) {
  const [activeKey, setActiveKey] = useState(STRATEGY_TOOLS[0].key);
  const [values, setValues] = useState<Record<string, Record<string, string>>>(strategicTools);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setValues(strategicTools);
  }, [strategicTools]);

  const active = STRATEGY_TOOLS.find((t) => t.key === activeKey)!;
  const activeValues = values[activeKey] || {};

  const setField = (field: string, value: string) => {
    setValues((prev) => ({
      ...prev,
      [activeKey]: { ...(prev[activeKey] || {}), [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateStrategyTool(ideaId, activeKey, values[activeKey] || {});
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in rounded-3xl border border-brand-100 bg-white p-6 shadow-soft">
      <div className="mb-5 flex flex-wrap gap-2">
        {STRATEGY_TOOLS.map((tool) => (
          <button
            key={tool.key}
            onClick={() => setActiveKey(tool.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tool.key === activeKey
                ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-card"
                : "bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700"
            }`}
          >
            {tool.label}
          </button>
        ))}
      </div>

      <h3 className="mb-3 text-lg font-bold text-slate-900">{active.label}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {active.fields.map((field) => (
          <div key={field}>
            <label className="mb-1 block text-sm font-medium text-slate-600">{field}</label>
            <textarea
              className="h-28 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100"
              value={activeValues[field] || ""}
              onChange={(e) => setField(field, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-card transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? "Saving…" : `Save ${active.label}`}
        </button>
        {savedAt && <span className="text-xs font-medium text-emerald-600">Saved ✓</span>}
      </div>
    </div>
  );
}
