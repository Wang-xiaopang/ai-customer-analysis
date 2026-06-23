"use client";

import { useState, useEffect } from "react";
import { getFreeUsedToday, getBonusRemaining, getTotalRemaining, getStoredEmail, setStoredEmail, isValidEmail } from "@/lib/storage";
import { Mail, Zap, Crown, MessageCircle } from "lucide-react";

export default function AccountPage() {
  const [freeUsed, setFreeUsed] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [total, setTotal] = useState(0);
  const [email, setEmail] = useState<string | null>(null);
  const [inputEmail, setInputEmail] = useState("");
  const [saved, setSaved] = useState(false);

  const refresh = () => {
    setFreeUsed(getFreeUsedToday());
    setBonus(getBonusRemaining());
    setTotal(getTotalRemaining());
    setEmail(getStoredEmail());
  };

  useEffect(refresh, []);

  const handleSaveEmail = () => {
    if (isValidEmail(inputEmail.trim())) {
      setStoredEmail(inputEmail.trim());
      setEmail(inputEmail.trim());
      setInputEmail("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      refresh();
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-[22px] font-bold tracking-tight text-[#1d1d1f]">账户中心</h1>
      <div className="space-y-3">
        {/* Plan */}
        <div className="apple-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f5f7]">
              <Crown className="h-4 w-4 text-[#86868b]" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#1d1d1f]">免费版</p>
              <p className="text-[12px] text-[#86868b]">每天 3 次免费分析</p>
            </div>
          </div>
        </div>

        {/* Quota */}
        <div className="apple-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#007AFF]/10">
              <Zap className="h-4 w-4 text-[#007AFF]" />
            </div>
            <div>
              <p className="text-[22px] font-bold tracking-tight text-[#1d1d1f]">{total} 次</p>
              <p className="text-[12px]">
                {freeUsed >= 3 ? (
                  <span className="text-[#FF3B30] font-medium">今日免费 3 次已用完</span>
                ) : (
                  <span className="text-[#86868b]">今日免费剩余 {3 - freeUsed} 次</span>
                )}
                <span className="text-[#86868b]"> · 奖励剩余 {bonus} 次</span>
              </p>
            </div>
          </div>
        </div>

        {/* Email */}
        <div className="apple-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f5f7]">
              <Mail className="h-4 w-4 text-[#86868b]" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#1d1d1f]">邮箱</p>
              {email ? (
                <p className="text-[14px] text-[#1d1d1f]">{email}</p>
              ) : (
                <p className="text-[12px] text-[#86868b]">填写邮箱可获得额外 10 次（仅一次）</p>
              )}
            </div>
          </div>
          {!email && (
            <div className="flex gap-2">
              <input
                type="email"
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveEmail()}
                placeholder="your@email.com"
                className="apple-input flex-1 !py-2.5 !text-[14px]"
              />
              <button
                onClick={handleSaveEmail}
                disabled={!inputEmail.trim() || !inputEmail.includes("@")}
                className="apple-btn-primary !rounded-full !px-5 !py-2.5 !text-[13px] disabled:opacity-40"
              >
                {saved ? "已保存" : "保存"}
              </button>
            </div>
          )}
        </div>

        {/* Upgrade */}
        <div className="apple-card p-5">
          <h3 className="mb-4 text-[13px] font-semibold text-[#1d1d1f]">升级会员</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-black/5 bg-[#f5f5f7] p-4">
              <p className="text-[14px] font-semibold text-[#1d1d1f]">Pro</p>
              <p className="text-[22px] font-bold text-[#1d1d1f]">
                ¥99<span className="text-[12px] font-normal text-[#86868b]">/月</span>
              </p>
              <p className="mt-1 text-[12px] text-[#86868b]">100 次 / 月</p>
            </div>
            <div className="rounded-xl border border-black/5 bg-[#f5f5f7] p-4">
              <p className="text-[14px] font-semibold text-[#1d1d1f]">Team</p>
              <p className="text-[22px] font-bold text-[#1d1d1f]">
                ¥299<span className="text-[12px] font-normal text-[#86868b]">/月</span>
              </p>
              <p className="mt-1 text-[12px] text-[#86868b]">500 次 / 月</p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="apple-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#34C759]/10">
              <MessageCircle className="h-4 w-4 text-[#34C759]" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#1d1d1f]">联系客服</p>
              <p className="text-[12px] text-[#86868b]">
                如需升级或合作，请发送邮件至{" "}
                <a href="mailto:70891853@qq.com" className="text-[#007AFF] hover:underline">
                  70891853@qq.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
