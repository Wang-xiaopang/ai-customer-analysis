// 邮箱格式验证
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const KEYS = {
  freeUsed: "free_used",
  freeDate: "free_date",
  email: "email",
  bonusUsed: "bonus_used",  // 奖励已用次数
} as const;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 今日免费版已用次数 (0-3) */
export function getFreeUsedToday(): number {
  if (typeof window === "undefined") return 0;
  const storedDate = localStorage.getItem(KEYS.freeDate);
  if (storedDate !== today()) {
    localStorage.setItem(KEYS.freeDate, today());
    localStorage.setItem(KEYS.freeUsed, "0");
    return 0;
  }
  return parseInt(localStorage.getItem(KEYS.freeUsed) || "0", 10);
}

/** 奖励剩余次数（总共10次，用完即止） */
export function getBonusRemaining(): number {
  if (typeof window === "undefined") return 0;
  const used = parseInt(localStorage.getItem(KEYS.bonusUsed) || "0", 10);
  return Math.max(0, 10 - used);
}

/** 消耗一次分析次数：先消耗免费额度，再消耗奖励 */
export function useAnalysisCount(): void {
  const free = getFreeUsedToday();
  if (free < 3) {
    localStorage.setItem(KEYS.freeUsed, String(free + 1));
  } else {
    const bonusUsed = parseInt(localStorage.getItem(KEYS.bonusUsed) || "0", 10);
    localStorage.setItem(KEYS.bonusUsed, String(bonusUsed + 1));
  }
}

/** 是否还能分析 */
export function canAnalyze(): boolean {
  return getFreeUsedToday() < 3 || getBonusRemaining() > 0;
}

/** 今日总剩余 */
export function getTotalRemaining(): number {
  return Math.max(0, 3 - getFreeUsedToday()) + getBonusRemaining();
}

export function getStoredEmail(): string | null {
  return localStorage.getItem(KEYS.email);
}

/** 绑定邮箱，获得10次奖励（仅首次绑定） */
export function setStoredEmail(email: string): void {
  const existing = localStorage.getItem(KEYS.email);
  localStorage.setItem(KEYS.email, email);
  // 只在首次绑定时重置奖励次数
  if (!existing) {
    localStorage.setItem(KEYS.bonusUsed, "0");
  }
}
