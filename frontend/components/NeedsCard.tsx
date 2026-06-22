"use client";

import type { PotentialNeed } from "@/lib/types";

const PRIORITY_STYLE: Record<string, string> = {
  "高": "bg-[#FF3B30]/10 text-[#FF3B30]",
  "中": "bg-[#FF9500]/10 text-[#FF9500]",
  "低": "bg-[#f5f5f7] text-[#86868b]",
};

interface Props {
  needs: PotentialNeed[];
}

export default function NeedsCard({ needs }: Props) {
  return (
    <div className="apple-card p-6">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
        潜在需求
      </p>
      <div className="space-y-1">
        {needs.map((n, i) => (
          <div
            key={i}
            className="rounded-xl p-4 transition-colors hover:bg-[#f5f5f7]"
          >
            <div className="mb-2 flex items-center gap-2.5">
              <span className="text-[15px] font-semibold text-[#1d1d1f]">{n.need}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_STYLE[n.priority] || ""}`}
              >
                {n.priority}
              </span>
            </div>
            <p className="text-[14px] leading-relaxed text-[#6e6e73]">
              {n.reason}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
