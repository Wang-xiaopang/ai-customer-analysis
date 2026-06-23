"use client";

import { useState, useEffect } from "react";
import { getFreeUsedToday, getBonusRemaining, getStoredEmail, setStoredEmail, isValidEmail } from "@/lib/storage";
import { Mail, Zap, Gift, Crown, MessageCircle } from "lucide-react";

export default function AccountPage() {
  const [freeUsed, setFreeUsed] = useState(0);
  const [bonusRemaining, setBonusRemaining] = useState(0);
  const [bonusUsed, setBonusUsed] = useState(0);
  const [email, setEmail] = useState<string | null>(null);
  const [inputEmail, setInputEmail] = useState("");
  const [saved, setSaved] = useState(false);

  const refresh = () => {
    setFreeUsed(getFreeUsedToday());
    const br = getBonusRemaining();
    setBonusRemaining(br);
    setBonusUsed(10 - br);
    setEmail(getStoredEmail());
  };

  useEffect(refresh, []);

  const handleSaveEmail = () => {
    if (isValidEmail(inputEmail.trim())) {
      setStoredEmail(inputEmail.trim());
      setSaved(true);
      refresh();
      setInputEmail("");
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-[22px] font-bold tracking-tight text-[#1d1d1f]">账户中心</h1>
      <div className="space-y-3">

        {/* Priority 1: Free */}
        <div className="apple-card p-5">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">使用优先级 ①</div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#007AFF]/10">
              <Zap className="h-4 w-4 text-[#007AFF]" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#1d1d1f]">免费额度 · 每天 3 次</p>
              {freeUsed >= 3 ? (
                <p className="text-[13px] font-medium text-[#FF3B30]">今日 3 次已用完 → 使用邮箱奖励</p>
              ) : (
                <p className="text-[12px] text-[#86868b]">
                  已用 {freeUsed} 次，剩余 <span className="font-semibold text-[#007AFF]">{3 - freeUsed}</span> 次
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Priority 2: Email Bonus */}
        {email ? (
          <div className="apple-card p-5">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">使用优先级 ②</div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#34C759]/10">
                <Gift className="h-4 w-4 text-[#34C759]" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-[#1d1d1f]">邮箱奖励 · 共 10 次</p>
                {bonusRemaining > 0 ? (
                  <p className="text-[12px] text-[#86868b]">
                    已用 {bonusUsed} 次，剩余 <span className="font-semibold text-[#34C759]">{bonusRemaining}</span> 次
                  </p>
                ) : (
                  <p className="text-[13px] font-medium text-[#FF3B30]">10 次已用完</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="apple-card p-5">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">使用优先级 ②（未激活）</div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f5f7]">
                <Gift className="h-4 w-4 text-[#86868b]" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-[#1d1d1f]">绑定邮箱获得 10 次奖励</p>
                <p className="text-[12px] text-[#86868b]">免费次数用完后自动使用</p>
              </div>
            </div>
          </div>
        )}

        {/* Priority 3: Paid (future) */}
        <div className="apple-card p-5">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">使用优先级 ③（即将上线）</div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f5f7]">
              <Crown className="h-4 w-4 text-[#86868b]" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#1d1d1f]">Pro 会员 · 100 次/月 · ¥99/月</p>
              <p className="text-[12px] text-[#86868b]">免费和奖励用完后自动使用。联系客服开通</p>
            </div>
          </div>
        </div>

        {/* Email binding */}
        <div className="apple-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f5f7]">
              <Mail className="h-4 w-4 text-[#86868b]" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#1d1d1f]">
                {email ? "已绑定邮箱" : "绑定邮箱获得 10 次奖励"}
              </p>
              {email && (
                <p className="text-[14px] text-[#1d1d1f]">{email}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              value={inputEmail}
              onChange={(e) => setInputEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveEmail()}
              placeholder={email ? "修改邮箱（不会重置奖励次数）" : "your@email.com"}
              className="apple-input flex-1 !py-2.5 !text-[14px]"
            />
            <button
              onClick={handleSaveEmail}
              disabled={!isValidEmail(inputEmail.trim())}
              className="apple-btn-primary !rounded-full !px-5 !py-2.5 !text-[13px] disabled:opacity-40 shrink-0"
            >
              {saved ? "已保存" : email ? "修改" : "绑定"}
            </button>
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
