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
import { useAnalysisCount, canAnalyze, setStoredEmail, isValidEmail, getFreeUsedToday } from "@/lib/storage";
import type {
  CompanyContext,
  CompanyAnalysis,
  SalesAnalysis,
  Messages,
  StageStatus,
} from "@/lib/types";

// 卡片逐个出现的延迟动画
function RevealCard({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <div
      className="animate-[fadeIn_0.5s_ease-out_both]"
      style={{ animationDelay: `${index * 0.15}s` }}
    >
      {children}
    </div>
  );
}

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
      setError(null);
      return;
    }

    // 用完免费次数时的提示
    const freeUsed = getFreeUsedToday();
    if (freeUsed >= 3 && input !== lastInput) {
      // 继续分析，消耗奖励次数
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

      closeRef.current = createSSEConnection(task_id, {
        onOpen: () => {
          updateStage("search", "running");
        },
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
        },
        onStageFailed: (stage) => {
          updateStage(stage, "failed");
        },
        onDone: () => {
          // 分析成功完成才扣次数
          useAnalysisCount();
          setLoading(false);
        },
      });
    } catch (e: any) {
      setError(e.message || "分析失败，请检查后端服务是否正常运行");
      setLoading(false);
    }
  }, []);

  // Restore task from URL hash (history "查看" / reanalyze / page refresh)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#task=")) {
      const tid = hash.replace("#task=", "");
      setTaskId(tid);
      fetch(`/api/analysis/${tid}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.status === "success" || data.status === "partial_success") {
            // 已完成：直接展示
            if (data.company_context) setCompanyContext(data.company_context);
            if (data.company_analysis) setCompanyAnalysis(data.company_analysis);
            if (data.sales_analysis) setSalesAnalysis(data.sales_analysis);
            if (data.messages) setMessages(data.messages);
            if (data.input_text) setLastInput(data.input_text);
            if (data.generated_at) setGeneratedAt(data.generated_at);
          } else if (data.status === "pending" || data.status === "running") {
            // 新任务：启动 SSE 流
            if (data.input_text) setLastInput(data.input_text);
            setLoading(true);
            setStages(INITIAL_STAGES.map((s) => ({ ...s })));
            closeRef.current = createSSEConnection(tid, {
              onOpen: () => updateStage("search", "running"),
              onSearchComplete: (d) => { setCompanyContext(d); updateStage("search", "success"); updateStage("company_analysis", "running"); },
              onCompanyAnalysis: (d) => { setCompanyAnalysis(d); updateStage("company_analysis", "success"); updateStage("sales_analysis", "running"); },
              onSalesAnalysis: (d) => { setSalesAnalysis(d); updateStage("sales_analysis", "success"); updateStage("messages", "running"); },
              onMessages: (d) => { setMessages(d); updateStage("messages", "success"); setGeneratedAt(new Date().toISOString()); },
              onError: (stage) => { if (stage !== "connection") updateStage(stage, "failed"); },
              onStageFailed: (stage) => updateStage(stage, "failed"),
              onDone: () => { useAnalysisCount(); setLoading(false); },
            });
          }
        })
        .catch(console.error);
    }
  }, []);

  const handleReanalyze = () => {
    if (lastInput) handleAnalyze(lastInput);
  };

  const handleEmailSubmit = () => {
    if (isValidEmail(email.trim())) {
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

  // 转 UTC+8 显示
  const toLocalTime = (iso: string) => {
    const d = new Date(iso);
    d.setHours(d.getHours() + 8); // UTC → UTC+8
    return d.toLocaleString("zh-CN", {
      month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
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
                <span>{toLocalTime(generatedAt)}</span>
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

          {[
            salesAnalysis?.executive_summary && (
              <ExecutiveSummaryCard key="s" data={salesAnalysis.executive_summary} />
            ),
            companyContext?.data_confidence && (
              <ConfidenceCard key="c" data={companyContext.data_confidence} companyName={companyContext.company_name} />
            ),
            salesAnalysis?.customer_score && (
              <ScoreCard key="sc" data={salesAnalysis.customer_score} />
            ),
            companyAnalysis?.company_profile && (
              <CompanyProfileCard key="cp" data={companyAnalysis.company_profile} />
            ),
            companyAnalysis?.signals && companyAnalysis.signals.length > 0 && (
              <SignalCard key="sig" signals={companyAnalysis.signals} />
            ),
            salesAnalysis?.potential_needs && salesAnalysis.potential_needs.length > 0 && (
              <NeedsCard key="pn" needs={salesAnalysis.potential_needs} />
            ),
            salesAnalysis?.sales_entry_points && salesAnalysis.sales_entry_points.filter(ep => ep.direction && ep.suggested_talk).length > 0 && (
              <EntryPointsCard key="ep" entryPoints={salesAnalysis.sales_entry_points.filter(ep => ep.direction && ep.suggested_talk)} />
            ),
            salesAnalysis?.contact_strategy && (
              <ContactStrategyCard key="cs" data={salesAnalysis.contact_strategy} />
            ),
            salesAnalysis?.next_actions && salesAnalysis.next_actions.length > 0 && (
              <NextActionsCard key="na" actions={salesAnalysis.next_actions} />
            ),
            messages && (
              <MessageCard key="msg" messages={messages} />
            ),
          ]
            .filter(Boolean)
            .map((card, i) => (
              <RevealCard key={i} index={i}>{card}</RevealCard>
            ))}

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
