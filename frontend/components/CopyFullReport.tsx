"use client";

import { Copy } from "lucide-react";
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
  const buildReportText = (): string => {
    const lines: string[] = [];
    const { companyName, generatedAt, companyContext, companyAnalysis, salesAnalysis, messages } = props;

    lines.push("━━━ AI客户分析报告 ━━━");
    lines.push("");
    lines.push(`公司：${companyName || "—"}`);
    lines.push(`分析时间：${generatedAt ? new Date(generatedAt).toLocaleString("zh-CN") : "—"}`);
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
      lines.push("评分依据：");
      cs.factors.forEach((f) => lines.push(`✓ ${f}`));
      lines.push("");
    }

    if (companyAnalysis?.company_profile) {
      const cp = companyAnalysis.company_profile;
      lines.push("━━━ 企业画像 ━━━");
      lines.push(`行业：${cp.industry}`);
      lines.push(`规模：${cp.scale}`);
      lines.push(`阶段：${cp.stage}`);
      lines.push(`主营业务：${cp.main_business}`);
      lines.push("");
    }

    if (companyAnalysis?.signals) {
      lines.push("━━━ 企业信号 ━━━");
      companyAnalysis.signals.forEach((s) => {
        lines.push(`• ${s.signal}`);
        lines.push(`  证据：${s.evidence}`);
      });
      lines.push("");
    }

    if (salesAnalysis?.potential_needs) {
      lines.push("━━━ 潜在需求 ━━━");
      salesAnalysis.potential_needs.forEach((n) => {
        lines.push(`• [${n.priority}] ${n.need}`);
        lines.push(`  依据：${n.reason}`);
      });
      lines.push("");
    }

    if (salesAnalysis?.sales_entry_points) {
      lines.push("━━━ 销售切入点 ━━━");
      salesAnalysis.sales_entry_points.forEach((ep) => {
        lines.push(`• ${ep.direction}`);
        lines.push(`  话术：${ep.suggested_talk}`);
      });
      lines.push("");
    }

    if (salesAnalysis?.contact_strategy) {
      const st = salesAnalysis.contact_strategy;
      lines.push("━━━ 联系建议 ━━━");
      lines.push(`话题：${st.best_topic}`);
      lines.push(`渠道：${st.recommended_channel}`);
      lines.push(`避免：${st.avoid_topics.join("、")}`);
      lines.push("");
    }

    if (messages) {
      lines.push("━━━ 开发信 ━━━");
      if (messages.email_message) {
        lines.push("【邮件版】");
        lines.push(messages.email_message);
        lines.push("");
      }
      if (messages.wechat_message) {
        lines.push("【微信版】");
        lines.push(messages.wechat_message);
        lines.push("");
      }
    }

    return lines.join("\n");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildReportText());
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs hover:bg-gray-50"
    >
      <Copy className="h-3 w-3" />
      复制完整报告
    </button>
  );
}
