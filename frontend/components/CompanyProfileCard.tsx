"use client";

import type { CompanyProfile } from "@/lib/types";
import { Building2, Users, TrendingUp, Briefcase } from "lucide-react";

interface Props {
  data: CompanyProfile;
}

const ITEMS = [
  { key: "industry", label: "行业", icon: Building2 },
  { key: "scale", label: "规模", icon: Users },
  { key: "stage", label: "发展阶段", icon: TrendingUp },
  { key: "main_business", label: "主营业务", icon: Briefcase },
] as const;

export default function CompanyProfileCard({ data }: Props) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <h3 className="mb-3 text-sm font-semibold">企业画像</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ITEMS.map(({ key, label, icon: Icon }) => (
          <div key={key} className="flex items-start gap-2">
            <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm">{(data as any)[key] || "—"}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
