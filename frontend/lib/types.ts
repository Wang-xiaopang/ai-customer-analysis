export interface DataConfidence {
  score: number;
  level: "高" | "中" | "低";
  detail: string;
}

export interface CompanyContext {
  company_name: string;
  website: string;
  industry: string;
  website_content: string;
  news: { title: string; url: string; snippet: string; date: string }[];
  data_confidence: DataConfidence;
}

export interface Signal {
  signal: string;
  reason: string;
  evidence: string;
  source: string;
}

export interface CompanyProfile {
  industry: string;
  scale: string;
  stage: string;
  main_business: string;
}

export interface CompanyAnalysis {
  company_profile: CompanyProfile;
  signals: Signal[];
  recent_updates: { title: string; description: string; evidence: string; source: string }[];
  risks: { risk: string; reason: string; evidence: string; source: string }[];
}

export interface CustomerScore {
  score: number;
  level: string;
  reason: string;
  factors: string[];
}

export interface PotentialNeed {
  need: string;
  priority: string;
  reason: string;
  evidence: string;
}

export interface SalesEntryPoint {
  direction: string;
  reason: string;
  evidence: string;
  suggested_talk: string;
}

export interface ContactStrategy {
  best_topic: string;
  reason: string;
  avoid_topics: string[];
  recommended_channel: string;
}

export interface ExecutiveSummary {
  verdict: "recommended" | "cautious" | "not_recommended";
  verdict_text: string;
  customer_value: string;
  reasons: string[];
  suggested_contacts: string[];
  best_timing: string;
}

export interface NextAction {
  step: number;
  action: string;
  url: string | null;
  estimated_time: string;
}

export interface SalesAnalysis {
  customer_score: CustomerScore;
  potential_needs: PotentialNeed[];
  sales_entry_points: SalesEntryPoint[];
  contact_strategy: ContactStrategy;
  executive_summary: ExecutiveSummary;
  next_actions: NextAction[];
}

export interface Messages {
  email_message: string;
  linkedin_message: string;
  wechat_message: string;
}

export type AnalysisStage = "search" | "company_analysis" | "sales_analysis" | "messages" | "done";

export interface StageStatus {
  stage: AnalysisStage;
  label: string;
  status: "pending" | "running" | "success" | "failed";
}
