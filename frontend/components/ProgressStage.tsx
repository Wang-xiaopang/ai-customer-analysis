"use client";

import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { StageStatus } from "@/lib/types";

interface Props {
  stages: StageStatus[];
}

const STAGE_LABELS: Record<string, string> = {
  search: "搜索企业信息",
  company_analysis: "企业分析",
  sales_analysis: "销售分析",
  messages: "生成开发信",
};

export default function ProgressStage({ stages }: Props) {
  return (
    <div className="space-y-2 rounded-lg border bg-white p-4">
      <p className="mb-3 text-sm font-medium text-muted-foreground">
        正在分析客户信息... 预计耗时15-30秒
      </p>
      {stages.map((s) => (
        <div key={s.stage} className="flex items-center gap-2 text-sm">
          {s.status === "running" && (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          {s.status === "success" && (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
          {s.status === "failed" && (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
          {s.status === "pending" && (
            <div className="h-4 w-4 rounded-full border-2 border-gray-200" />
          )}
          <span className={s.status === "failed" ? "text-red-500" : ""}>
            {STAGE_LABELS[s.stage] || s.label}
            {s.status === "failed" && " — 失败"}
          </span>
        </div>
      ))}
    </div>
  );
}
