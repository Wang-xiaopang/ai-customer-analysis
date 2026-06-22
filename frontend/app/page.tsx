"use client";

import { useState, useCallback, useRef } from "react";
import SearchInput from "@/components/SearchInput";
import ProgressStage from "@/components/ProgressStage";
// Card components created in Task 13
import ExecutiveSummaryCard from "@/components/ExecutiveSummaryCard";
import ConfidenceCard from "@/components/ConfidenceCard";
import ScoreCard from "@/components/ScoreCard";
import CompanyProfileCard from "@/components/CompanyProfileCard";
import SignalCard from "@/components/SignalCard";
import NeedsCard from "@/components/NeedsCard";
import EntryPointsCard from "@/components/EntryPointsCard";
import ContactStrategyCard from "@/components/ContactStrategyCard";
import NextActionsCard from "@/components/NextActionsCard";
import MessageCard from "@/components/MessageCard";
import CopyFullReport from "@/components/CopyFullReport";
import { createSSEConnection } from "@/lib/sse-client";
import { incrementAnalysisCount, canAnalyze } from "@/lib/storage";
import type {
  CompanyContext,
  CompanyAnalysis,
  SalesAnalysis,
  Messages,
  StageStatus,
} from "@/lib/types";

const INITIAL_STAGES: StageStatus[] = [
  { stage: "search", label: "搜索企业信息", status: "pending" },
  { stage: "company_analysis", label: "企业分析", status: "pending" },
  { stage: "sales_analysis", label: "销售分析", status: "pending" },
  { stage: "messages", label: "生成开发信", status: "pending" },
];

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [stages, setStages] = useState<StageStatus[]>(INITIAL_STAGES);
  const [companyContext, setCompanyContext] = useState<CompanyContext | null>(null);
  const [companyAnalysis, setCompanyAnalysis] = useState<CompanyAnalysis | null>(null);
  const [salesAnalysis, setSalesAnalysis] = useState<SalesAnalysis | null>(null);
  const [messages, setMessages] = useState<Messages | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const closeRef = useRef<(() => void) | null>(null);

  const updateStage = (stage: string, status: "running" | "success" | "failed") => {
    setStages((prev) =>
      prev.map((s) => (s.stage === stage ? { ...s, status } : s))
    );
  };

  const handleAnalyze = useCallback(async (input: string) => {
    if (!canAnalyze()) {
      setError("今日免费分析次数已用完（3次/天）。请输入邮箱获取额外10次。");
      return;
    }

    setLoading(true);
    setError(null);
    setCompanyContext(null);
    setCompanyAnalysis(null);
    setSalesAnalysis(null);
    setMessages(null);
    setGeneratedAt(null);
    setStages(INITIAL_STAGES.map((s) => ({ ...s })));

    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "创建分析任务失败");
      }
      const { task_id } = await res.json();
      setTaskId(task_id);
      window.location.hash = `task=${task_id}`;
      incrementAnalysisCount();

      closeRef.current = createSSEConnection(task_id, {
        onSearchComplete: (data) => {
          setCompanyContext(data);
          updateStage("search", "success");
          updateStage("company_analysis", "running");
        },
        onCompanyAnalysis: (data) => {
          setCompanyAnalysis(data);
          updateStage("company_analysis", "success");
          updateStage("sales_analysis", "running");
        },
        onSalesAnalysis: (data) => {
          setSalesAnalysis(data);
          updateStage("sales_analysis", "success");
          updateStage("messages", "running");
        },
        onMessages: (data) => {
          setMessages(data);
          updateStage("messages", "success");
          setGeneratedAt(new Date().toISOString());
        },
        onError: (stage, message) => {
          if (stage !== "connection") updateStage(stage, "failed");
          setError(message);
        },
        onStageFailed: (stage) => {
          updateStage(stage, "failed");
        },
        onDone: () => {
          setLoading(false);
        },
      });
    } catch (e: any) {
      setError(e.message || "分析失败");
      setLoading(false);
    }
  }, []);

  const handleReanalyze = () => {
    if (taskId) {
      handleAnalyze(
        companyContext?.company_name || ""
      );
    }
  };

  const isComplete = companyAnalysis !== null || salesAnalysis !== null;

  return (
    <div className="space-y-6">
      <section className="text-center">
        <h1 className="mb-2 text-2xl font-bold">AI客户分析助手</h1>
        <p className="mb-6 text-muted-foreground">
          输入客户公司名称或官网，30秒生成客户画像、潜在需求和销售切入策略
        </p>
        <SearchInput onAnalyze={handleAnalyze} disabled={loading} />
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
      </section>

      {loading && <ProgressStage stages={stages} />}

      {isComplete && (
        <>
          {/* Meta bar */}
          <div className="flex items-center justify-between rounded-lg border bg-white px-4 py-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              {generatedAt && (
                <span>分析时间：{new Date(generatedAt).toLocaleString("zh-CN")}</span>
              )}
              {companyContext?.data_confidence && (
                <span>
                  数据完整度：{companyContext.data_confidence.score}% · {companyContext.data_confidence.level}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReanalyze}
                className="rounded-md border px-3 py-1 text-xs hover:bg-gray-50"
              >
                重新分析
              </button>
              <CopyFullReport
                companyName={companyContext?.company_name}
                generatedAt={generatedAt}
                companyContext={companyContext}
                companyAnalysis={companyAnalysis}
                salesAnalysis={salesAnalysis}
                messages={messages}
              />
            </div>
          </div>

          {salesAnalysis?.executive_summary && (
            <ExecutiveSummaryCard data={salesAnalysis.executive_summary} />
          )}
          {companyContext?.data_confidence && (
            <ConfidenceCard data={companyContext.data_confidence} />
          )}
          {salesAnalysis?.customer_score && (
            <ScoreCard data={salesAnalysis.customer_score} />
          )}
          {companyAnalysis?.company_profile && (
            <CompanyProfileCard data={companyAnalysis.company_profile} />
          )}
          {companyAnalysis?.signals && companyAnalysis.signals.length > 0 && (
            <SignalCard signals={companyAnalysis.signals} />
          )}
          {salesAnalysis?.potential_needs && salesAnalysis.potential_needs.length > 0 && (
            <NeedsCard needs={salesAnalysis.potential_needs} />
          )}
          {salesAnalysis?.sales_entry_points && salesAnalysis.sales_entry_points.length > 0 && (
            <EntryPointsCard entryPoints={salesAnalysis.sales_entry_points} />
          )}
          {salesAnalysis?.contact_strategy && (
            <ContactStrategyCard data={salesAnalysis.contact_strategy} />
          )}
          {salesAnalysis?.next_actions && salesAnalysis.next_actions.length > 0 && (
            <NextActionsCard actions={salesAnalysis.next_actions} />
          )}
          {messages && <MessageCard messages={messages} />}
        </>
      )}
    </div>
  );
}
