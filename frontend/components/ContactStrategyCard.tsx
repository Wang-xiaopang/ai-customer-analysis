"use client";

import type { ContactStrategy } from "@/lib/types";

interface Props {
  data: ContactStrategy;
}

export default function ContactStrategyCard({ data }: Props) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-3 text-sm font-semibold">首次联系建议</h3>
      <div className="space-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">最佳切入话题：</span>
          {data.best_topic}
        </p>
        <p className="text-xs text-muted-foreground">原因：{data.reason}</p>
        <p>
          <span className="text-muted-foreground">避免话题：</span>
          {data.avoid_topics.join("、")}
        </p>
        <p>
          <span className="text-muted-foreground">推荐渠道：</span>
          {data.recommended_channel}
        </p>
      </div>
    </div>
  );
}
