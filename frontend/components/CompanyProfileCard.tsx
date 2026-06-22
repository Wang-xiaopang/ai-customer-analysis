"use client";

import type { CompanyProfile } from "@/lib/types";
import { Building2, Users, TrendingUp, Briefcase, Globe } from "lucide-react";

interface Props {
  data: CompanyProfile;
}

const FIELDS = [
  { key: "industry", label: "行业", icon: Globe },
  { key: "scale", label: "规模", icon: Users },
  { key: "stage", label: "阶段", icon: TrendingUp },
  { key: "main_business", label: "主营", icon: Briefcase },
] as const;

export default function CompanyProfileCard({ data }: Props) {
  return (
    <div className="apple-card p-6">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
        企业画像
      </p>
      <div className="grid grid-cols-2 gap-4">
        {FIELDS.map(({ key, label, icon: Icon }) => (
          <div key={key} className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f5f5f7]">
              <Icon className="h-4 w-4 text-[#86868b]" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#86868b]">
                {label}
              </p>
              <p className="mt-0.5 text-[14px] leading-snug text-[#1d1d1f]">
                {(data as any)[key] || "—"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
