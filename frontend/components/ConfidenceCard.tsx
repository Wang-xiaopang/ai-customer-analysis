"use client";

import type { DataConfidence } from "@/lib/types";

const LEVEL_COLOR = {
  "高": "bg-green-100 text-green-700",
  "中": "bg-yellow-100 text-yellow-700",
  "低": "bg-red-100 text-red-700",
};

interface Props {
  data: DataConfidence;
}

export default function ConfidenceCard({ data }: Props) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-3 text-sm font-semibold">数据完整度</h3>
      <div className="mb-2 flex items-center gap-3">
        <div className="text-2xl font-bold">{data.score}%</div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_COLOR[data.level] || ""}`}>
          {data.level}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{data.detail}</p>
    </div>
  );
}
