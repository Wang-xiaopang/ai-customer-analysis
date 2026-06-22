import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "客户情报 — AI 销售分析",
  description: "输入公司名称，秒级生成客户画像、销售策略与开发信",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {/* Apple-style glass header */}
        <header className="apple-glass sticky top-0 z-50">
          <div className="mx-auto flex h-[52px] max-w-[720px] items-center justify-between px-5">
            <a
              href="/"
              className="text-[17px] font-semibold tracking-tight text-[#1d1d1f] no-underline"
            >
              客户情报
            </a>
            <nav className="flex items-center gap-1">
              <a
                href="/history"
                className="rounded-full px-4 py-1.5 text-[13px] font-medium text-[#6e6e73] transition-colors hover:bg-black/5 hover:text-[#1d1d1f]"
              >
                历史
              </a>
              <a
                href="/account"
                className="rounded-full px-4 py-1.5 text-[13px] font-medium text-[#6e6e73] transition-colors hover:bg-black/5 hover:text-[#1d1d1f]"
              >
                账户
              </a>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-[720px] px-5 pb-24 pt-10">
          {children}
        </main>
      </body>
    </html>
  );
}
