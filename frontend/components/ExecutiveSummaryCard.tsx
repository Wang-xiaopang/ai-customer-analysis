"use client";

import { CheckCircle, AlertTriangle, XCircle, Sparkles } from "lucide-react";
import type { ExecutiveSummary } from "@/lib/types";

const CONFIG = {
  recommended: {
    icon: CheckCircle,
    bg: "bg-gradient-to-b from-[#F0FFF4] to-white",
    border: "border-[#34C759]/20",
    accent: "text-[#34C759]",
    badge: "bg-[#34C759]/10 text-[#34C759]",
  },
  cautious: {
    icon: AlertTriangle,
    bg: "bg-gradient-to-b from-[#FFF9F0] to-white",
    border: "border-[#FF9500]/20",
    accent: "text-[#FF9500]",
    badge: "bg-[#FF9500]/10 text-[#FF9500]",
  },
  not_recommended: {
    icon: XCircle,
    bg: "bg-gradient-to-b from-[#FFF5F5] to-white",
    border: "border-[#FF3B30]/20",
    accent: "text-[#FF3B30]",
    badge: "bg-[#FF3B30]/10 text-[#FF3B30]",
  },
} as const;

interface Props {
  data: ExecutiveSummary;
}

export default function ExecutiveSummaryCard({ data }: Props) {
  const c = CONFIG[data.verdict] || CONFIG.recommended;
  const Icon = c.icon;

  return (
    <div className={`apple-card overflow-hidden ${c.bg} border ${c.border}`}>
      <div className="p-6 sm:p-8">
        {/* Header */}
        <div className="mb-5 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#007AFF]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
            AI 销售建议
          </span>
        </div>

        {/* Verdict */}
        <div className="mb-5 flex items-center gap-3">
          <Icon className={`h-7 w-7 ${c.accent}`} />
          <span className={`text-[28px] font-extrabold tracking-[-0.02em] ${c.accent}`}>
            {data.verdict_text}
          </span>
        </div>

        {/* Value badge */}
        <div className="mb-6">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium ${c.badge}`}>
            客户价值 · {data.customer_value}
          </span>
        </div>

        {/* Reasons */}
        <div className="mb-6 space-y-2">
          {data.reasons.map((r, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className={`mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ${c.badge} text-[10px] font-bold`}>
                ✓
              </span>
              <span className="text-[15px] leading-relaxed text-[#1d1d1f]">{r}</span>
            </div>
          ))}
        </div>

        {/* Contact & Timing */}
        <div className="flex flex-col gap-1.5 border-t border-black/5 pt-5 sm:flex-row sm:justify-between">
          <span className="text-[13px] text-[#6e6e73]">
            建议联系：<span className="font-medium text-[#1d1d1f]">{data.suggested_contacts.join(" · ")}</span>
          </span>
          <span className="text-[13px] text-[#6e6e73]">
            推荐时机：<span className="font-medium text-[#1d1d1f]">{data.best_timing}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
