"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, RefreshCw } from "lucide-react";

interface HistoryItem {
  task_id: string;
  company_name: string;
  status: string;
  generated_at: string | null;
  created_at: string | null;
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((data) => setItems(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleReanalyze = async (item: HistoryItem) => {
    // Navigate to home page with pre-filled input
    router.push(`/?reanalyze=${item.task_id}`);
  };

  if (loading) {
    return <p className="text-center text-muted-foreground">加载中...</p>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">暂无分析记录</p>
        <a href="/" className="mt-2 inline-block text-sm text-primary hover:underline">
          开始第一次分析 →
        </a>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">历史记录</h1>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.task_id}
            className="flex items-center justify-between rounded-lg border bg-white p-4"
          >
            <div>
              <p className="font-medium">{item.company_name}</p>
              <p className="text-xs text-muted-foreground">
                {item.generated_at
                  ? new Date(item.generated_at).toLocaleString("zh-CN")
                  : new Date(item.created_at || "").toLocaleString("zh-CN")}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/?task=${item.task_id}`)}
                className="rounded-md border px-3 py-1 text-xs hover:bg-gray-50"
              >
                查看
              </button>
              <button
                onClick={() => handleReanalyze(item)}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs hover:bg-gray-50"
              >
                <RefreshCw className="h-3 w-3" />
                重新分析
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
