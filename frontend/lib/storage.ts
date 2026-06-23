// 正确的邮箱格式验证
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const STORAGE_KEYS = {
  analysisCount: "analysis_count",
  analysisDate: "analysis_date",
  email: "email",
  bonusRemaining: "bonus_remaining",
} as const;

export function getTodayAnalysisCount(): number {
  if (typeof window === "undefined") return 0;
  const today = new Date().toISOString().slice(0, 10);
  const storedDate = localStorage.getItem(STORAGE_KEYS.analysisDate);
  if (storedDate !== today) {
    localStorage.setItem(STORAGE_KEYS.analysisDate, today);
    localStorage.setItem(STORAGE_KEYS.analysisCount, "0");
    return 0;
  }
  return parseInt(localStorage.getItem(STORAGE_KEYS.analysisCount) || "0", 10);
}

export function incrementAnalysisCount(): number {
  const count = getTodayAnalysisCount() + 1;
  localStorage.setItem(STORAGE_KEYS.analysisCount, String(count));
  return count;
}

export function getBonusRemaining(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(STORAGE_KEYS.bonusRemaining) || "0", 10);
}

export function setBonusRemaining(count: number) {
  localStorage.setItem(STORAGE_KEYS.bonusRemaining, String(count));
}

export function canAnalyze(): boolean {
  const daily = getTodayAnalysisCount();
  const bonus = getBonusRemaining();
  return daily < 3 || bonus > 0;
}

export function getStoredEmail(): string | null {
  return localStorage.getItem(STORAGE_KEYS.email);
}

export function setStoredEmail(email: string) {
  localStorage.setItem(STORAGE_KEYS.email, email);
  setBonusRemaining(10);
}
