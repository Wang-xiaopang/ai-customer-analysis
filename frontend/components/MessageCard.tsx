"use client";

import type { Messages } from "@/lib/types";
import CopyButton from "./CopyButton";
import { Mail, Linkedin, MessageCircle } from "lucide-react";

interface Props {
  messages: Messages;
}

export default function MessageCard({ messages }: Props) {
  const channels = [
    { key: "email_message", label: "邮件", icon: Mail, data: messages.email_message },
    { key: "linkedin_message", label: "LinkedIn", icon: Linkedin, data: messages.linkedin_message },
    { key: "wechat_message", label: "微信", icon: MessageCircle, data: messages.wechat_message },
  ];

  return (
    <div className="apple-card p-6">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
        开发信
      </p>
      <div className="space-y-3">
        {channels.map((ch) => (
          <div key={ch.key} className="overflow-hidden rounded-xl border border-black/5">
            <div className="flex items-center justify-between bg-[#f5f5f7] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <ch.icon className="h-3.5 w-3.5 text-[#86868b]" />
                <span className="text-[13px] font-medium text-[#1d1d1f]">{ch.label}</span>
              </div>
              <CopyButton text={ch.data} />
            </div>
            <div className="bg-white px-4 py-3 text-[14px] leading-relaxed text-[#1d1d1f] whitespace-pre-wrap">
              {ch.data || "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
