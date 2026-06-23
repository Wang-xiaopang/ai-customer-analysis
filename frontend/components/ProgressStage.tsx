"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import type { StageStatus } from "@/lib/types";

interface Props {
  stages: StageStatus[];
  startTime?: number;
}

const STAGE_LABELS: Record<string, string> = {
  search: "搜索企业信息",
  company_analysis: "企业分析",
  sales_analysis: "销售策略分析",
  messages: "生成开发信",
};

const STAGE_SUBTITLES: Record<string, string> = {
  search: "DuckDuckGo 搜索中",
  company_analysis: "AI 正在分析企业画像",
  sales_analysis: "AI 正在生成销售策略",
  messages: "AI 正在撰写开发信",
};

export default function ProgressStage({ stages, startTime }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const base = startTime || Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - base) / 1000));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTime]);

  const runningStage = stages.find((s) => s.status === "running");
  const completedCount = stages.filter((s) => s.status === "success").length;
  const hasFailed = stages.some((s) => s.status === "failed");

  return (
    <div className="mx-auto max-w-[380px] pt-16 text-center">
      {/* Apple-style pulsing ring */}
      <div className="mb-8 inline-flex items-center justify-center">
        <div className="relative flex h-16 w-16 items-center justify-center">
          {/* Outer rings */}
          <div className="absolute inset-0 animate-[ping_2s_ease-out_infinite] rounded-full border-2 border-[#007AFF]/20" />
          <div className="absolute inset-0 animate-[ping_2s_ease-out_0.5s_infinite] rounded-full border border-[#007AFF]/10" />
          {/* Center dot */}
          <div className="h-3 w-3 animate-pulse rounded-full bg-[#007AFF]" />
        </div>
      </div>

      {/* Status */}
      <p className="mb-1 text-[17px] font-semibold tracking-tight text-[#1d1d1f]">
        {runningStage ? STAGE_LABELS[runningStage.stage] : "正在分析…"}
      </p>
      <p className="mb-8 text-[13px] text-[#86868b]">
        {runningStage ? STAGE_SUBTITLES[runningStage.stage] : ""}
      </p>

      {/* Steps */}
      <div className="space-y-0">
        {stages.map((s, i) => (
          <div key={s.stage}>
            <div className="flex items-center gap-3 py-2">
              {/* Step number / icon */}
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
                  s.status === "success"
                    ? "bg-[#34C759] text-white"
                    : s.status === "running"
                    ? "bg-[#007AFF] text-white"
                    : s.status === "failed"
                    ? "bg-[#FF3B30] text-white"
                    : "bg-[#f5f5f7] text-[#86868b]"
                }`}
              >
                {s.status === "success" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : s.status === "failed" ? (
                  <XCircle className="h-4 w-4" />
                ) : s.status === "running" ? (
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                ) : (
                  <span className="text-[12px] font-semibold">{i + 1}</span>
                )}
              </div>

              {/* Label */}
              <div className="text-left">
                <span
                  className={`text-[14px] ${
                    s.status === "running"
                      ? "font-semibold text-[#1d1d1f]"
                      : s.status === "success"
                      ? "text-[#1d1d1f]"
                      : s.status === "failed"
                      ? "text-[#FF3B30]"
                      : "text-[#86868b]"
                  }`}
                >
                  {STAGE_LABELS[s.stage]}
                </span>
                {s.status === "running" && (
                  <span className="ml-2 text-[12px] text-[#007AFF]">
                    {elapsed}s
                  </span>
                )}
              </div>
            </div>

            {/* Connector line */}
            {i < stages.length - 1 && (
              <div className="ml-[13px] h-4 w-px bg-[#e5e5e7]" />
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <p className="mt-6 text-[12px] text-[#86868b]">
        {hasFailed
          ? "部分阶段失败，分析结果可能不完整"
          : completedCount > 0
          ? `已完成 ${completedCount}/4，预计还需 ${Math.max(5, (4 - completedCount) * 10)}–${Math.max(8, (4 - completedCount) * 15)} 秒`
          : "正在搜索企业信息，预计 15–30 秒"}
      </p>
    </div>
  );
}
