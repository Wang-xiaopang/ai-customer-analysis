"use client";

import type { CustomerScore } from "@/lib/types";

interface Props {
  data: CustomerScore;
}

export default function ScoreCard({ data }: Props) {
  return (
    <div className="apple-card p-6 sm:p-8">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
        客户价值评分
      </p>
      <div className="flex items-baseline gap-2">
        <span className="text-[56px] font-extrabold leading-none tracking-[-0.03em] text-[#1d1d1f]">
          {data.score}
        </span>
        <span className="text-[20px] font-semibold text-[#86868b]">
          {data.level}级
        </span>
      </div>
      <p className="mt-2 max-w-md text-[15px] leading-relaxed text-[#6e6e73]">
        {data.reason}
      </p>

      {data.factors.length > 0 && (
        <div className="mt-6 border-t border-black/5 pt-5">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#86868b]">
            评分依据
          </p>
          <div className="flex flex-wrap gap-2">
            {data.factors.map((f, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f5f7] px-3 py-1.5 text-[13px] font-medium text-[#1d1d1f]"
              >
                <span className="text-[#007AFF]">✓</span>
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
