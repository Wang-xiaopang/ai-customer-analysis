"use client";

import type { NextAction } from "@/lib/types";
import { ExternalLink, Clock } from "lucide-react";

interface Props {
  actions: NextAction[];
}

export default function NextActionsCard({ actions }: Props) {
  const totalMins = actions.reduce((acc, a) => {
    const mins = parseInt(a.estimated_time) || 0;
    return acc + mins;
  }, 0);

  return (
    <div className="apple-card p-6">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
        下一步行动
      </p>
      <div className="space-y-0">
        {actions.map((a, i) => (
          <div
            key={a.step}
            className="group flex items-start gap-4 rounded-xl p-4 transition-colors hover:bg-[#f5f5f7]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#007AFF]/10 text-[14px] font-bold text-[#007AFF]">
              {a.step}
            </span>
            <div className="flex-1">
              <p className="text-[15px] text-[#1d1d1f]">{a.action}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[12px] text-[#86868b]">
                  <Clock className="h-3 w-3" />
                  {a.estimated_time}
                </span>
                {a.url && (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-[#007AFF] opacity-0 transition-opacity group-hover:opacity-100 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    前往
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 border-t border-black/5 pt-4 text-center">
        <span className="text-[13px] text-[#86868b]">
          预计总耗时约 <span className="font-semibold text-[#1d1d1f]">{totalMins} 分钟</span>
        </span>
      </div>
    </div>
  );
}
