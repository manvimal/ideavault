export interface IdeaSummary {
  id: string;
  title: string;
  snippet: string;
  created_at: string;
  updated_at: string;
}

export interface Idea {
  id: string;
  title: string;
  content: string;
  ai_generated_description: string;
  created_at: string;
  updated_at: string;
  strategic_tools: Record<string, Record<string, string>>;
}

export type BusinessCaseJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface BusinessCaseJob {
  id: string;
  idea_id: string;
  status: BusinessCaseJobStatus;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  elapsed_seconds: number;
  generated_tokens: number;
  max_tokens: number;
  partial_content: string;
  truncated: boolean;
  cancel_requested: boolean;
  error: string | null;
}

export interface MindmapNode {
  name: string;
  children: MindmapNode[];
}

export const STRATEGY_TOOLS: { key: string; label: string; fields: string[] }[] = [
  {
    key: "swot",
    label: "SWOT",
    fields: ["Strengths", "Weaknesses", "Opportunities", "Threats"],
  },
  {
    key: "ansoff",
    label: "Ansoff Matrix",
    fields: [
      "Market Penetration",
      "Market Development",
      "Product Development",
      "Diversification",
    ],
  },
  {
    key: "value_chain",
    label: "Value Chain Analysis",
    fields: [
      "Inbound Logistics",
      "Operations",
      "Outbound Logistics",
      "Marketing & Sales",
      "Service",
      "Support Activities",
    ],
  },
  {
    key: "revenue_margin_matrix",
    label: "Revenue / Margin Matrix",
    fields: ["High Revenue / High Margin", "High Revenue / Low Margin", "Low Revenue / High Margin", "Low Revenue / Low Margin"],
  },
  {
    key: "porter_five_forces",
    label: "Porter's Five Forces",
    fields: [
      "Competitive Rivalry",
      "Threat of New Entrants",
      "Threat of Substitutes",
      "Bargaining Power of Suppliers",
      "Bargaining Power of Buyers",
    ],
  },
  {
    key: "flywheel_moat",
    label: "Flywheel / Moat",
    fields: ["Flywheel Loop", "Economic Moat", "Reinforcing Feedback", "Defensibility Risks"],
  },
  {
    key: "three_horizons",
    label: "Three Horizons",
    fields: ["Horizon 1 (Core)", "Horizon 2 (Emerging)", "Horizon 3 (Future Bets)"],
  },
  {
    key: "customer_value",
    label: "Customer Value Proposition",
    fields: ["Customer Jobs", "Pains", "Gains", "Pain Relievers", "Gain Creators"],
  },
];
