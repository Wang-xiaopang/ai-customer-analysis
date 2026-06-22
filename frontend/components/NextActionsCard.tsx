"use client";

import type { NextAction } from "@/lib/types";
import { ExternalLink } from "lucide-react";

interface Props {
  actions: NextAction[];
}

export default function NextActionsCard({ actions }: Props) {
  const totalTime = actions.reduce((acc, a) => {
    const mins = parseInt(a.estimated_time) || 0;
    return acc + mins;
  }, 0);

  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-3 text-sm font-semibold">下一步行动</h3>
      <div className="space-y-3">
        {actions.map((a) => (
          <div key={a.step} className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {a.step}
            </span>
            <div className="flex-1">
              <p className="text-sm">{a.action}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">预计耗时：{a.estimated_time}</span>
                {a.url && (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    前往
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm font-medium text-muted-foreground">
        总耗时：约{totalTime}分钟
      </p>
    </div>
  );
}
