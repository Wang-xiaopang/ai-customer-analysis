"use client";

import type { CustomerScore } from "@/lib/types";

interface Props {
  data: CustomerScore;
}

export default function ScoreCard({ data }: Props) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-3 text-sm font-semibold">客户价值评分</h3>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-primary">{data.score}分</span>
        <span className="text-lg text-muted-foreground">{data.level}级客户</span>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">{data.reason}</p>
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">评分依据</p>
        <ul className="space-y-1">
          {data.factors.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-1 text-green-500">✓</span>
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
