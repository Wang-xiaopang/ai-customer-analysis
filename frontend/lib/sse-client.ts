import type { CompanyContext, CompanyAnalysis, SalesAnalysis, Messages } from "./types";

type SSECallback = {
  onOpen?: () => void;
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

  // 连接建立即触发：标记阶段1运行中
  eventSource.onopen = () => {
    callbacks.onOpen?.();
  };

  let received = false;

  // Connection timeout — if no event in 15s, something is wrong
  const timeoutId = setTimeout(() => {
    if (!received) {
      callbacks.onError?.("connection", "分析服务响应超时，请稍后重试");
      eventSource.close();
    }
  }, 30000);

  const markReceived = () => {
    if (!received) {
      received = true;
      clearTimeout(timeoutId);
    }
  };

  eventSource.addEventListener("search_complete", (e) => {
    markReceived();
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
    markReceived();
    try {
      const data = JSON.parse(e.data);
      callbacks.onError?.(data.stage, data.message);
    } catch {
      callbacks.onError?.("connection", "分析服务异常");
    }
  });

  eventSource.addEventListener("stage_failed", (e) => {
    const data = JSON.parse(e.data);
    callbacks.onStageFailed?.(data.stage, data.retry);
  });

  eventSource.addEventListener("done", () => {
    clearTimeout(timeoutId);
    callbacks.onDone?.();
    eventSource.close();
  });

  eventSource.onerror = () => {
    clearTimeout(timeoutId);
    callbacks.onError?.("connection", "连接中断，请检查服务器状态");
    eventSource.close();
  };

  return () => {
    clearTimeout(timeoutId);
    eventSource.close();
  };
}
