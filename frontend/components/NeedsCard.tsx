"use client";

import type { PotentialNeed } from "@/lib/types";

const PRIORITY_COLOR: Record<string, string> = {
  "高": "bg-red-100 text-red-700",
  "中": "bg-yellow-100 text-yellow-700",
  "低": "bg-gray-100 text-gray-700",
};

interface Props {
  needs: PotentialNeed[];
}

export default function NeedsCard({ needs }: Props) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-3 text-sm font-semibold">潜在需求</h3>
      <div className="space-y-4">
        {needs.map((n, i) => (
          <div key={i} className="border-b pb-3 last:border-b-0 last:pb-0">
            <div className="mb-1 flex items-center gap-2">
              <span className="font-medium">{n.need}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${PRIORITY_COLOR[n.priority] || ""}`}>
                {n.priority}优先级
              </span>
            </div>
            <p className="mb-1 text-sm text-muted-foreground">判断依据：{n.reason}</p>
            <p className="text-sm text-muted-foreground">证据：{n.evidence}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
