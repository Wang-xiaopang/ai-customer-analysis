import type { CompanyContext, CompanyAnalysis, SalesAnalysis, Messages } from "./types";

type SSECallback = {
  onSearchComplete?: (data: CompanyContext) => void;
  onCompanyAnalysis?: (data: CompanyAnalysis) => void;
  onSalesAnalysis?: (data: SalesAnalysis) => void;
  onMessages?: (data: Messages) => void;
  onError?: (stage: string, message: string) => void;
  onStageFailed?: (stage: string, retry: boolean) => void;
  onDone?: () => void;
};

export function createSSEConnection(taskId: string, callbacks: SSECallback): () => void {
  const url = `/api/analysis/${taskId}/stream`;
  const eventSource = new EventSource(url);

  eventSource.addEventListener("search_complete", (e) => {
    callbacks.onSearchComplete?.(JSON.parse(e.data));
  });

  eventSource.addEventListener("company_analysis", (e) => {
    callbacks.onCompanyAnalysis?.(JSON.parse(e.data));
  });

  eventSource.addEventListener("sales_analysis", (e) => {
    callbacks.onSalesAnalysis?.(JSON.parse(e.data));
  });

  eventSource.addEventListener("messages", (e) => {
    callbacks.onMessages?.(JSON.parse(e.data));
  });

  eventSource.addEventListener("error", (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data);
      callbacks.onError?.(data.stage, data.message);
    } catch {
      callbacks.onError?.("connection", "SSE连接错误");
    }
  });

  eventSource.addEventListener("stage_failed", (e) => {
    const data = JSON.parse(e.data);
    callbacks.onStageFailed?.(data.stage, data.retry);
  });

  eventSource.addEventListener("done", () => {
    callbacks.onDone?.();
    eventSource.close();
  });

  // Generic error handler
  eventSource.onerror = () => {
    callbacks.onError?.("connection", "SSE连接中断");
    eventSource.close();
  };

  return () => eventSource.close();
}
