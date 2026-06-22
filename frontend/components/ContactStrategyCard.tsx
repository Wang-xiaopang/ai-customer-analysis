"use client";

import type { ContactStrategy } from "@/lib/types";
import { MessageCircle, AlertTriangle, Phone } from "lucide-react";

interface Props {
  data: ContactStrategy;
}

export default function ContactStrategyCard({ data }: Props) {
  return (
    <div className="apple-card p-6">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
        首次联系建议
      </p>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#007AFF]/10">
            <MessageCircle className="h-4 w-4 text-[#007AFF]" />
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#86868b]">最佳切入话题</p>
            <p className="mt-0.5 text-[15px] text-[#1d1d1f]">{data.best_topic}</p>
            <p className="mt-1 text-[13px] text-[#6e6e73]">{data.reason}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FF3B30]/10">
            <AlertTriangle className="h-4 w-4 text-[#FF3B30]" />
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#86868b]">避免话题</p>
            <p className="mt-0.5 text-[15px] text-[#1d1d1f]">{data.avoid_topics.join(" · ")}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#34C759]/10">
            <Phone className="h-4 w-4 text-[#34C759]" />
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#86868b]">推荐渠道</p>
            <p className="mt-0.5 text-[15px] font-medium text-[#1d1d1f]">{data.recommended_channel}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
