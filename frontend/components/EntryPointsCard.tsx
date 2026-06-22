"use client";

import type { SalesEntryPoint } from "@/lib/types";

interface Props {
  entryPoints: SalesEntryPoint[];
}

export default function EntryPointsCard({ entryPoints }: Props) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-3 text-sm font-semibold">销售切入点</h3>
      <div className="space-y-4">
        {entryPoints.map((ep, i) => (
          <div key={i} className="border-b pb-3 last:border-b-0 last:pb-0">
            <p className="mb-1 font-medium">{ep.direction}</p>
            <p className="mb-1 text-sm text-muted-foreground">原因：{ep.reason}</p>
            <p className="mb-2 text-sm text-muted-foreground">证据：{ep.evidence}</p>
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs text-muted-foreground">建议话术</p>
              <p className="text-sm italic">{ep.suggested_talk}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
