"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle2, XCircle, Search, Building2, Target, MessageSquare } from "lucide-react";
import type { StageStatus } from "@/lib/types";

interface Props {
  stages: StageStatus[];
  startTime?: number;
}

const STAGE_CONFIG = {
  search: {
    label: "搜索信息",
    icon: Search,
    detail: (elapsed: number) =>
      elapsed <= 8
        ? "正在 Bing 搜索企业公开信息…"
        : "搜索耗时较长，请耐心等待…",
  },
  company_analysis: {
    label: "企业分析",
    icon: Building2,
    detail: () => "AI 正在分析企业画像与关键信号…",
  },
  sales_analysis: {
    label: "销售策略",
    icon: Target,
    detail: () => "AI 正在生成销售策略与切入点…",
  },
  messages: {
    label: "开发信",
    icon: MessageSquare,
    detail: () => "AI 正在撰写个性化开发信…",
  },
} as const;

// 计时器驱动的阶段顺序
const STAGE_ORDER = ["search", "company_analysis", "sales_analysis", "messages"] as const;
const STAGE_TIMING = [0, 4, 12, 20]; // 每个阶段开始的秒数

export default function ProgressStage({ stages, startTime }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const base = startTime || Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - base) / 1000));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTime]);

  const runningKey = stages.find((s) => s.status === "running")?.stage;
  const failedKey = stages.find((s) => s.status === "failed")?.stage;

  return (
    <div className="mx-auto max-w-[480px] pt-16 text-center">
      {/* Apple pulsing ring */}
      <div className="mb-6 inline-flex items-center justify-center">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <div className="absolute inset-0 animate-[ping_2s_ease-out_infinite] rounded-full border-2 border-[#007AFF]/20" />
          <div className="absolute inset-0 animate-[ping_2s_ease-out_0.5s_infinite] rounded-full border border-[#007AFF]/10" />
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#007AFF]" />
        </div>
      </div>

      {/* Status text — 基于计时器，不依赖 SSE */}
      {(() => {
        // 找当前应该运行的阶段（基于计时器）
        let currentIdx = STAGE_ORDER.findLastIndex(
          (_, i) => elapsed >= STAGE_TIMING[i]
        );
        if (currentIdx < 0) currentIdx = 0;

        const done = stages.every((s) => s.status === "success");
        const stageKey = done
          ? STAGE_ORDER[3]
          : (stages.find((s) => s.status === "running")?.stage as keyof typeof STAGE_CONFIG) ||
            STAGE_ORDER[currentIdx];
        const cfg = STAGE_CONFIG[stageKey];

        return (
          <>
            <p className="mb-2 text-[17px] font-semibold tracking-tight text-[#1d1d1f]">
              {done ? "分析完成" : cfg?.label || "正在分析…"}
            </p>
            <p className="mb-10 text-[13px] text-[#86868b]">
              {done
                ? "正在整理报告…"
                : cfg?.detail
                ? cfg.detail(elapsed)
                : "准备中…"}
              <span className="ml-2 tabular-nums">{elapsed > 0 ? `${elapsed}s` : ""}</span>
            </p>
          </>
        );
      })()}

      {/* Horizontal progress bar with 4 nodes */}
      <div className="relative flex items-center justify-between px-4">
        {/* Background track */}
        <div className="absolute left-8 right-8 top-[18px] h-0.5 bg-[#e5e5e7]" />
        {/* Filled track */}
        <div
          className="absolute left-8 top-[18px] h-0.5 bg-[#007AFF] transition-all duration-700"
          style={{
            right: `${
              stages.filter((s) => s.status === "pending").length * 25 + 8
            }%`,
          }}
        />

        {stages.map((s, i) => {
          const cfg = STAGE_CONFIG[s.stage as keyof typeof STAGE_CONFIG];
          const Icon = cfg.icon;
          const isDone = s.status === "success";
          const isRunning = s.status === "running";
          const isFailed = s.status === "failed";

          return (
            <div key={s.stage} className="relative z-10 flex flex-col items-center gap-2">
              {/* Node */}
              <div
                className={`flex h-[36px] w-[36px] items-center justify-center rounded-full transition-all duration-500 ${
                  isDone
                    ? "bg-[#34C759] text-white shadow-[0_0_0_4px_rgba(52,199,89,0.15)]"
                    : isRunning
                    ? "bg-[#007AFF] text-white shadow-[0_0_0_4px_rgba(0,122,255,0.2)] animate-pulse"
                    : isFailed
                    ? "bg-[#FF3B30] text-white"
                    : "bg-white border-2 border-[#e5e5e7] text-[#86868b]"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-[18px] w-[18px]" />
                ) : isFailed ? (
                  <XCircle className="h-[18px] w-[18px]" />
                ) : isRunning ? (
                  <Icon className="h-[16px] w-[16px]" />
                ) : (
                  <span className="text-[13px] font-semibold">{i + 1}</span>
                )}
              </div>
              {/* Label */}
              <span
                className={`text-[11px] whitespace-nowrap transition-colors ${
                  isDone
                    ? "font-medium text-[#34C759]"
                    : isRunning
                    ? "font-semibold text-[#007AFF]"
                    : isFailed
                    ? "font-medium text-[#FF3B30]"
                    : "text-[#86868b]"
                }`}
              >
                {cfg.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <p className="mt-8 text-[12px] text-[#86868b]">
        {stages.every((s) => s.status === "success")
          ? "分析完成，正在整理报告…"
          : `预计还需 ${Math.max(3, 30 - elapsed)} 秒`}
      </p>
    </div>
  );
}
