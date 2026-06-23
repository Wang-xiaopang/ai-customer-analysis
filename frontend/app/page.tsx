"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import SearchInput from "@/components/SearchInput";
import ProgressStage from "@/components/ProgressStage";
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
import { incrementAnalysisCount, canAnalyze, setStoredEmail } from "@/lib/storage";
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
  const [lastInput, setLastInput] = useState<string>("");
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState("");
  const [pendingInput, setPendingInput] = useState("");
  const closeRef = useRef<(() => void) | null>(null);

  const updateStage = (stage: string, status: "running" | "success" | "failed") => {
    setStages((prev) =>
      prev.map((s) => (s.stage === stage ? { ...s, status } : s))
    );
  };

  const handleAnalyze = useCallback(async (input: string) => {
    if (!canAnalyze()) {
      setPendingInput(input);
      setShowEmailModal(true);
      return;
    }

    setLoading(true);
    setError(null);
    setCompanyContext(null);
    setCompanyAnalysis(null);
    setSalesAnalysis(null);
    setMessages(null);
    setGeneratedAt(null);
    setLastInput(input);
    setStartTime(Date.now());
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
      setError(e.message || "分析失败，请检查后端服务是否正常运行");
      setLoading(false);
    }
  }, []);

  // Restore task from URL hash (history "查看" / page refresh)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#task=")) {
      const tid = hash.replace("#task=", "");
      setTaskId(tid);
      fetch(`/api/analysis/${tid}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.status === "success" || data.status === "partial_success") {
            if (data.company_context) setCompanyContext(data.company_context);
            if (data.company_analysis) setCompanyAnalysis(data.company_analysis);
            if (data.sales_analysis) setSalesAnalysis(data.sales_analysis);
            if (data.messages) setMessages(data.messages);
            if (data.input_text) setLastInput(data.input_text);
            if (data.generated_at) setGeneratedAt(data.generated_at);
          }
        })
        .catch(console.error);
    }

    // Handle ?reanalyze=xxx from history page
    const params = new URLSearchParams(window.location.search);
    const reanalyzeId = params.get("reanalyze");
    if (reanalyzeId) {
      fetch(`/api/history/${reanalyzeId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.input_text) {
            handleAnalyze(data.input_text);
          }
        })
        .catch(console.error);
      // Clean up URL
      window.history.replaceState({}, "", "/");
    }
  }, []);

  const handleReanalyze = () => {
    if (lastInput) handleAnalyze(lastInput);
  };

  const handleEmailSubmit = () => {
    if (email.trim() && email.includes("@")) {
      setStoredEmail(email.trim());
      setShowEmailModal(false);
      setError(null);
      // 自动继续分析
      if (pendingInput) {
        handleAnalyze(pendingInput);
        setPendingInput("");
      }
    }
  };

  const isComplete = companyAnalysis !== null || salesAnalysis !== null;

  return (
    <div>
      {!isComplete && !loading && (
        <section className="pt-16 text-center">
          <h1 className="mb-3 text-[40px] font-extrabold leading-[1.1] tracking-[-0.02em] text-[#1d1d1f]">
            了解你的
            <br />
            下一个客户
          </h1>
          <p className="mb-10 text-[17px] leading-relaxed text-[#6e6e73]">
            输入公司名称或官网，即时获取深度客户情报、
            <br />
            销售策略与个性化开发信
          </p>
          <SearchInput onAnalyze={handleAnalyze} disabled={loading} />
          {error && (
            <div className="mx-auto mt-4 max-w-md rounded-2xl border border-red-100 bg-red-50/50 px-5 py-3 text-[13px] text-red-500">
              {error}
            </div>
          )}
        </section>
      )}

      {loading && (
        <section className="pt-16">
          <ProgressStage stages={stages} startTime={startTime} />
        </section>
      )}

      {isComplete && (
        <div className="space-y-5">
          <div className="flex items-center justify-between text-[13px] text-[#86868b]">
            <div className="flex items-center gap-4">
              {generatedAt && (
                <span>
                  {new Date(generatedAt).toLocaleString("zh-CN", {
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
              {companyContext?.data_confidence && (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#34C759]" />
                  数据完整度 {companyContext.data_confidence.score}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReanalyze}
                className="apple-btn-secondary !rounded-full !px-4 !py-1.5 !text-[12px]"
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
            <ConfidenceCard data={companyContext.data_confidence} companyName={companyContext.company_name} />
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

          <div className="h-8" />
        </div>
      )}

      {/* ━━━ Email Modal ━━━ */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="apple-card mx-5 w-full max-w-[380px] p-8">
            <h2 className="mb-2 text-[20px] font-bold tracking-tight text-[#1d1d1f]">
              获取额外 10 次
            </h2>
            <p className="mb-6 text-[14px] leading-relaxed text-[#86868b]">
              今日免费次数已用完。输入邮箱即可免费获得 10 次额外分析。
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
              placeholder="your@email.com"
              className="apple-input mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowEmailModal(false)}
                className="apple-btn-secondary flex-1 !rounded-full !py-2.5 !text-[14px]"
              >
                取消
              </button>
              <button
                onClick={handleEmailSubmit}
                disabled={!email.trim() || !email.includes("@")}
                className="apple-btn-primary flex-1 !rounded-full !py-2.5 !text-[14px] disabled:opacity-40"
              >
                获取 10 次
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
