"use client";

import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import type { ExecutiveSummary } from "@/lib/types";

const VERDICT_ICON = {
  recommended: CheckCircle,
  cautious: AlertTriangle,
  not_recommended: XCircle,
} as const;

const VERDICT_COLOR = {
  recommended: "text-green-600",
  cautious: "text-yellow-600",
  not_recommended: "text-red-600",
} as const;

interface Props {
  data: ExecutiveSummary;
}

export default function ExecutiveSummaryCard({ data }: Props) {
  const Icon = VERDICT_ICON[data.verdict] || CheckCircle;
  const colorClass = VERDICT_COLOR[data.verdict] || "text-green-600";

  return (
    <div className="rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-white p-6">
      <h2 className="mb-4 text-lg font-bold">AI销售建议</h2>
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`h-6 w-6 ${colorClass}`} />
        <span className={`text-xl font-bold ${colorClass}`}>{data.verdict_text}</span>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        客户价值：<span className="font-semibold text-foreground">{data.customer_value}</span>
      </p>
      <div className="mb-3">
        <p className="mb-1 text-sm font-medium">推荐理由：</p>
        <ul className="space-y-1">
          {data.reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-1 text-green-500">✓</span>
              {r}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-sm text-muted-foreground">
        建议联系：{data.suggested_contacts.join("、")}
      </p>
      <p className="text-sm text-muted-foreground">推荐时机：{data.best_timing}</p>
    </div>
  );
}
