"use client";

import { useState, useEffect } from "react";
import { getTodayAnalysisCount, getBonusRemaining, getStoredEmail } from "@/lib/storage";

export default function AccountPage() {
  const [todayCount, setTodayCount] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setTodayCount(getTodayAnalysisCount());
    setBonus(getBonusRemaining());
    setEmail(getStoredEmail());
  }, []);

  const totalRemaining = Math.max(0, 3 - todayCount) + bonus;

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">账户中心</h1>
      <div className="space-y-4">
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-3 text-sm font-semibold">当前套餐</h3>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium">免费版</span>
            <span className="text-sm text-muted-foreground">每天 3 次免费分析</span>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-3 text-sm font-semibold">今日剩余</h3>
          <p className="text-2xl font-bold text-primary">{totalRemaining} 次</p>
          <p className="text-xs text-muted-foreground">
            今日已用 {todayCount} 次 · 奖励剩余 {bonus} 次
          </p>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-3 text-sm font-semibold">邮箱</h3>
          {email ? (
            <p className="text-sm">{email}</p>
          ) : (
            <p className="text-sm text-muted-foreground">未填写邮箱</p>
          )}
        </div>

        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-3 text-sm font-semibold">升级会员</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md border p-4">
              <p className="font-semibold">Pro 版</p>
              <p className="text-2xl font-bold">¥99<span className="text-sm font-normal text-muted-foreground">/月</span></p>
              <p className="text-sm text-muted-foreground">100 次分析 / 月</p>
            </div>
            <div className="rounded-md border p-4">
              <p className="font-semibold">Team 版</p>
              <p className="text-2xl font-bold">¥299<span className="text-sm font-normal text-muted-foreground">/月</span></p>
              <p className="text-sm text-muted-foreground">500 次分析 / 月</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">如需升级，请联系客服。支付系统将在后续版本上线。</p>
        </div>
      </div>
    </div>
  );
}
