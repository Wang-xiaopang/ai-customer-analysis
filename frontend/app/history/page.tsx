"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, RefreshCw, Eye } from "lucide-react";

interface HistoryItem {
  task_id: string;
  company_name: string;
  status: string;
  verdict: string;
  verdict_text: string;
  generated_at: string | null;
  created_at: string | null;
}

const VERDICT_STYLE: Record<string, string> = {
  recommended: "bg-[#34C759]/10 text-[#34C759]",
  cautious: "bg-[#FF9500]/10 text-[#FF9500]",
  not_recommended: "bg-[#FF3B30]/10 text-[#FF3B30]",
};

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((data) => setItems(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleView = (item: HistoryItem) => {
    // 用 hash 参数，主页支持任务恢复
    window.location.href = `/#task=${item.task_id}`;
  };

  const handleReanalyze = async (item: HistoryItem) => {
    setReanalyzing(item.task_id);
    try {
      // 获取任务详情拿到 input_text
      const res = await fetch(`/api/history/${item.task_id}`);
      const data = await res.json();
      // 创建新分析任务
      const newRes = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: data.input_text }),
      });
      const { task_id } = await newRes.json();
      window.location.href = `/#task=${task_id}`;
    } catch (e) {
      console.error("重新分析失败", e);
    }
    setReanalyzing(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-5 w-5 animate-pulse rounded-full bg-[#007AFF]" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-20 text-center">
        <FileText className="mx-auto h-10 w-10 text-[#e5e5e7]" />
        <p className="mt-4 text-[15px] text-[#86868b]">暂无分析记录</p>
        <a href="/" className="mt-3 inline-block text-[14px] font-medium text-[#007AFF] hover:underline">
          开始第一次分析 →
        </a>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-[22px] font-bold tracking-tight text-[#1d1d1f]">历史记录</h1>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.task_id}
            className="apple-card flex items-center justify-between p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[15px] font-medium text-[#1d1d1f]">{item.company_name}</p>
                {item.verdict && (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${VERDICT_STYLE[item.verdict] || ""}`}>
                    {item.verdict_text}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[12px] text-[#86868b]">
                {(() => {
                  const iso = item.generated_at || item.created_at;
                  if (!iso) return "—";
                  return new Date(iso).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
                })()}
              </p>
            </div>
            <div className="ml-4 flex shrink-0 items-center gap-2">
              <button
                onClick={() => handleView(item)}
                className="apple-btn-secondary !rounded-full !px-4 !py-1.5 !text-[12px]"
              >
                <Eye className="h-3 w-3" />
                查看
              </button>
              <button
                onClick={() => handleReanalyze(item)}
                disabled={reanalyzing === item.task_id}
                className="apple-btn-secondary !rounded-full !px-4 !py-1.5 !text-[12px]"
              >
                <RefreshCw className={`h-3 w-3 ${reanalyzing === item.task_id ? "animate-spin" : ""}`} />
                重新分析
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
