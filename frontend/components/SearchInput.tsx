"use client";

import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";

interface Props {
  onAnalyze: (input: string) => void;
  disabled: boolean;
}

export default function SearchInput({ onAnalyze, disabled }: Props) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      onAnalyze(value.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[540px]">
      <div
        className={`flex items-center gap-2 rounded-2xl bg-white transition-all duration-300 ${
          focused
            ? "shadow-[0_0_0_4px_rgba(0,122,255,0.12)] ring-1 ring-[#007AFF]/20"
            : "shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
        }`}
      >
        <div className="flex-1 flex items-center gap-3 pl-5">
          <Search className="h-[18px] w-[18px] shrink-0 text-[#86868b]" />
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="输入公司名称或官网…"
            className="flex-1 border-0 bg-transparent py-4 text-[17px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none"
            disabled={disabled}
          />
        </div>
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="apple-btn-primary mr-2 !px-5 !py-2.5 !text-[15px] disabled:opacity-30"
        >
          <span>分析</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
