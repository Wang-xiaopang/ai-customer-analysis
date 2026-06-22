"use client";

import type { SalesEntryPoint } from "@/lib/types";

interface Props {
  entryPoints: SalesEntryPoint[];
}

export default function EntryPointsCard({ entryPoints }: Props) {
  return (
    <div className="apple-card p-6">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
        销售切入点
      </p>
      <div className="space-y-4">
        {entryPoints.map((ep, i) => (
          <div key={i} className="rounded-xl bg-[#f5f5f7] p-4">
            <p className="mb-1 text-[15px] font-semibold text-[#1d1d1f]">{ep.direction}</p>
            <p className="mb-3 text-[14px] leading-relaxed text-[#6e6e73]">{ep.reason}</p>
            <div className="rounded-xl border border-black/5 bg-white p-4">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#86868b]">
                建议话术
              </p>
              <p className="text-[14px] leading-relaxed text-[#1d1d1f] italic">
                {ep.suggested_talk}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
