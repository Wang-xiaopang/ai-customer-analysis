"use client";

import type { Messages } from "@/lib/types";
import CopyButton from "./CopyButton";
import { Mail, Linkedin, MessageCircle } from "lucide-react";

interface Props {
  messages: Messages;
}

export default function MessageCard({ messages }: Props) {
  const channels = [
    { key: "email_message", label: "邮件版", icon: Mail, data: messages.email_message },
    { key: "linkedin_message", label: "LinkedIn版", icon: Linkedin, data: messages.linkedin_message },
    { key: "wechat_message", label: "微信版", icon: MessageCircle, data: messages.wechat_message },
  ];

  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-3 text-sm font-semibold">开发信</h3>
      <div className="space-y-4">
        {channels.map((ch) => (
          <div key={ch.key}>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ch.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{ch.label}</span>
              </div>
              <CopyButton text={ch.data} />
            </div>
            <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
              {ch.data || "生成失败"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
