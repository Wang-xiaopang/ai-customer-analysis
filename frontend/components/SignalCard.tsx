"use client";

import type { Signal } from "@/lib/types";
import { TrendingUp, ExternalLink } from "lucide-react";

interface Props {
  signals: Signal[];
}

export default function SignalCard({ signals }: Props) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-3 text-sm font-semibold">企业信号</h3>
      <div className="space-y-4">
        {signals.map((s, i) => (
          <div key={i} className="border-b pb-3 last:border-b-0 last:pb-0">
            <div className="mb-1 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="font-medium">{s.signal}</span>
            </div>
            <p className="mb-1 text-sm text-muted-foreground">原因：{s.reason}</p>
            <p className="mb-1 text-sm text-muted-foreground">证据：{s.evidence}</p>
            {s.source && (
              <a
                href={s.source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                来源
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
