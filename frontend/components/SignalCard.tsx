"use client";

import type { Signal } from "@/lib/types";
import { TrendingUp, ExternalLink } from "lucide-react";

interface Props {
  signals: Signal[];
}

export default function SignalCard({ signals }: Props) {
  return (
    <div className="apple-card p-6">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
        企业信号
      </p>
      <div className="space-y-1">
        {signals.map((s, i) => (
          <div
            key={i}
            className="group rounded-xl p-4 transition-colors hover:bg-[#f5f5f7]"
          >
            <div className="mb-2 flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#007AFF]/10">
                <TrendingUp className="h-3.5 w-3.5 text-[#007AFF]" />
              </div>
              <span className="text-[15px] font-semibold text-[#1d1d1f]">{s.signal}</span>
            </div>
            <p className="mb-1 ml-[38px] text-[14px] leading-relaxed text-[#6e6e73]">
              {s.evidence}
            </p>
            {s.source && (
              <a
                href={s.source}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-[38px] mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-[#007AFF] opacity-0 transition-opacity group-hover:opacity-100 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                查看来源
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
