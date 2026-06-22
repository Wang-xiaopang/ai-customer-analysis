"use client";

import type { DataConfidence } from "@/lib/types";

const LEVEL_STYLE: Record<string, { dot: string; label: string }> = {
  "高": { dot: "bg-[#34C759]", label: "数据充足，分析可信" },
  "中": { dot: "bg-[#FF9500]", label: "部分数据，仅供参考" },
  "低": { dot: "bg-[#FF3B30]", label: "信息有限，推测为主" },
};

interface Props {
  data: DataConfidence;
  companyName: string;
}

export default function ConfidenceCard({ data, companyName }: Props) {
  const style = LEVEL_STYLE[data.level] || LEVEL_STYLE["中"];

  return (
    <div className="apple-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`inline-block h-2 w-2 rounded-full ${style.dot}`} />
          <div>
            <span className="text-[13px] font-medium text-[#1d1d1f]">
              {companyName}
            </span>
            <span className="ml-2 text-[12px] text-[#86868b]">
              数据完整度 {data.score}%
            </span>
          </div>
        </div>
        <span className="text-[12px] text-[#86868b]">{style.label}</span>
      </div>
    </div>
  );
}
