"use client";

import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { StageStatus } from "@/lib/types";

interface Props {
  stages: StageStatus[];
}

const STAGE_LABELS: Record<string, string> = {
  search: "搜索企业信息",
  company_analysis: "企业分析中",
  sales_analysis: "销售策略分析中",
  messages: "生成开发信",
};

export default function ProgressStage({ stages }: Props) {
  const runningStage = stages.find((s) => s.status === "running");
  const completedCount = stages.filter((s) => s.status === "success").length;

  return (
    <div className="mx-auto max-w-[360px] pt-20 text-center">
      {/* Spinner */}
      <div className="mb-6 inline-flex items-center justify-center">
        <div className="relative">
          <Loader2 className="h-10 w-10 animate-spin text-[#007AFF]" />
          <div className="absolute inset-0 h-10 w-10 animate-pulse rounded-full bg-[#007AFF]/10" />
        </div>
      </div>

      {/* Status text */}
      <p className="mb-2 text-[17px] font-semibold text-[#1d1d1f]">
        {runningStage ? STAGE_LABELS[runningStage.stage] : "正在分析…"}
      </p>
      <p className="mb-8 text-[14px] text-[#86868b]">
        预计还需 {Math.max(1, 4 - completedCount) * 5}–{Math.max(1, 4 - completedCount) * 8} 秒
      </p>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2">
        {stages.map((s, i) => (
          <div key={s.stage} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-500 ${
                s.status === "success"
                  ? "bg-[#34C759] text-white"
                  : s.status === "running"
                  ? "bg-[#007AFF] text-white shadow-[0_0_0_4px_rgba(0,122,255,0.2)]"
                  : s.status === "failed"
                  ? "bg-[#FF3B30] text-white"
                  : "bg-[#e5e5e7] text-[#86868b]"
              }`}
            >
              {s.status === "success" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : s.status === "failed" ? (
                <XCircle className="h-4 w-4" />
              ) : (
                <span className="text-[11px] font-semibold">{i + 1}</span>
              )}
            </div>
            {i < stages.length - 1 && (
              <div
                className={`h-0.5 w-6 transition-colors duration-500 ${
                  s.status === "success" ? "bg-[#34C759]/40" : "bg-[#e5e5e7]"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Stage labels */}
      <div className="mt-3 flex justify-center gap-0 text-[11px] text-[#86868b]">
        {stages.map((s, i) => (
          <div key={s.stage} className="flex items-center">
            <span className="w-16 text-center">{STAGE_LABELS[s.stage]?.replace(/中$/, "")}</span>
            {i < stages.length - 1 && <span className="w-8" />}
          </div>
        ))}
      </div>
    </div>
  );
}
