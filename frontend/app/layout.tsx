import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI客户分析助手",
  description: "输入公司名称，30秒生成客户画像与销售策略",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 text-foreground antialiased">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            <a href="/" className="text-lg font-bold text-primary">
              AI客户分析助手
            </a>
            <nav className="flex gap-4 text-sm text-muted-foreground">
              <a href="/history">历史记录</a>
              <a href="/account">账户</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
