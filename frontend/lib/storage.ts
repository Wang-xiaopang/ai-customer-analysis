// 邮箱格式验证
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 超级账号
const SUPER_EMAIL = "70891853@qq.com";

export function isSuperAdmin(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEYS.email) === SUPER_EMAIL;
}

const KEYS = {
  freeUsed: "free_used",
  freeDate: "free_date",
  email: "email",
  bonusUsed: "bonus_used",
} as const;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

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

export function getBonusRemaining(): number {
  if (typeof window === "undefined") return 0;
  if (isSuperAdmin()) return 1000000;
  const used = parseInt(localStorage.getItem(KEYS.bonusUsed) || "0", 10);
  return Math.max(0, 10 - used);
}

export function useAnalysisCount(): void {
  if (isSuperAdmin()) return;  // 超级账号不计数
  const free = getFreeUsedToday();
  if (free < 3) {
    localStorage.setItem(KEYS.freeUsed, String(free + 1));
  } else {
    const bonusUsed = parseInt(localStorage.getItem(KEYS.bonusUsed) || "0", 10);
    localStorage.setItem(KEYS.bonusUsed, String(bonusUsed + 1));
  }
}

export function canAnalyze(): boolean {
  if (isSuperAdmin()) return true;
  return getFreeUsedToday() < 3 || getBonusRemaining() > 0;
}

export function getTotalRemaining(): number {
  if (isSuperAdmin()) return 1000000;
  return Math.max(0, 3 - getFreeUsedToday()) + getBonusRemaining();
}

export function getStoredEmail(): string | null {
  return localStorage.getItem(KEYS.email);
}

export function setStoredEmail(email: string): void {
  const existing = localStorage.getItem(KEYS.email);
  localStorage.setItem(KEYS.email, email);
  if (!existing) {
    localStorage.setItem(KEYS.bonusUsed, "0");
  }
}
