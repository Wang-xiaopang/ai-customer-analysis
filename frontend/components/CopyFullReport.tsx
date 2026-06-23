"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import type { CompanyContext, CompanyAnalysis, SalesAnalysis, Messages } from "@/lib/types";

interface Props {
  companyName?: string;
  generatedAt: string | null;
  companyContext: CompanyContext | null;
  companyAnalysis: CompanyAnalysis | null;
  salesAnalysis: SalesAnalysis | null;
  messages: Messages | null;
}

export default function CopyFullReport(props: Props) {
  const [copied, setCopied] = useState(false);

  const buildReportText = (): string => {
    const lines: string[] = [];
    const { companyName, generatedAt, companyContext, companyAnalysis, salesAnalysis, messages } = props;

    lines.push("━━━ 客户情报报告 ━━━");
    lines.push("");
    lines.push(`公司：${companyName || "—"}`);
    if (generatedAt) {
      lines.push(`分析时间：${new Date(generatedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`);
    }
    if (companyContext?.data_confidence) {
      lines.push(`数据完整度：${companyContext.data_confidence.score}% · ${companyContext.data_confidence.level}`);
    }
    lines.push("");

    if (salesAnalysis?.executive_summary) {
      const es = salesAnalysis.executive_summary;
      lines.push("━━━ AI销售建议 ━━━");
      lines.push(`${es.verdict_text} · 客户价值：${es.customer_value}`);
      lines.push("");
      lines.push("推荐理由：");
      es.reasons.forEach((r) => lines.push(`✓ ${r}`));
      lines.push("");
      lines.push(`建议联系：${es.suggested_contacts.join("、")}`);
      lines.push(`推荐时机：${es.best_timing}`);
      lines.push("");
    }

    if (salesAnalysis?.customer_score) {
      const cs = salesAnalysis.customer_score;
      lines.push("━━━ 客户评分 ━━━");
      lines.push(`${cs.score}分 · ${cs.level}级客户`);
      lines.push(cs.reason);
      lines.push("");
    }

    if (companyAnalysis?.company_profile) {
      const cp = companyAnalysis.company_profile;
      lines.push("━━━ 企业画像 ━━━");
      lines.push(`行业：${cp.industry}  规模：${cp.scale}  阶段：${cp.stage}`);
      lines.push(`主营业务：${cp.main_business}`);
      lines.push("");
    }

    if (companyAnalysis?.signals) {
      lines.push("━━━ 企业信号 ━━━");
      companyAnalysis.signals.forEach((s) => {
        lines.push(`• ${s.signal} — ${s.evidence}`);
      });
      lines.push("");
    }

    if (salesAnalysis?.potential_needs) {
      lines.push("━━━ 潜在需求 ━━━");
      salesAnalysis.potential_needs.forEach((n) => {
        lines.push(`• [${n.priority}] ${n.need} — ${n.reason}`);
      });
      lines.push("");
    }

    if (salesAnalysis?.sales_entry_points) {
      lines.push("━━━ 销售切入点 ━━━");
      salesAnalysis.sales_entry_points.forEach((ep) => {
        lines.push(`• ${ep.direction} — ${ep.suggested_talk}`);
      });
      lines.push("");
    }

    if (salesAnalysis?.contact_strategy) {
      const st = salesAnalysis.contact_strategy;
      lines.push("━━━ 联系建议 ━━━");
      lines.push(`话题：${st.best_topic}  渠道：${st.recommended_channel}`);
      lines.push("");
    }

    if (messages) {
      lines.push("━━━ 开发信 ━━━");
      if (messages.email_message) lines.push(`【邮件】${messages.email_message}`);
      if (messages.wechat_message) lines.push(`【微信】${messages.wechat_message}`);
    }

    return lines.join("\n");
  };

  const handleCopy = async () => {
    const text = buildReportText();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // HTTP 环境 fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="apple-btn-secondary !rounded-full !px-4 !py-1.5 !text-[12px]"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-[#34C759]" />
          已复制
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          复制报告
        </>
      )}
    </button>
  );
}
