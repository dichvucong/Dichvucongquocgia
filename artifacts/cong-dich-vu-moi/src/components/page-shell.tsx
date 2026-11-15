import type { ReactNode } from "react";
import { Link } from "wouter";
import { ChevronLeft, Home } from "lucide-react";
import { ROUTES } from "@/lib/routes";

export function PageShell({ title, subtitle, back, children, showFooterNotice = true, disclaimerTone = "default" }: { title: string; subtitle?: string; back?: { href: string; label: string }; showFooterNotice?: boolean; disclaimerTone?: "default" | "earthy"; children: ReactNode }) {
  const lc = "inline-flex items-center gap-1.5 rounded px-3 py-2 text-sm text-white/95 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6c766]";
  return (
    <div className="min-h-[100dvh] bg-[#fdfbf9] text-[#2b2523]">
      <div className={disclaimerTone === "earthy" ? "bg-[#f1e5dd] px-4 py-1.5 text-center text-[11px] font-semibold tracking-[0.12em] text-[#855844]" : "bg-[#8f3b37] px-4 py-1.5 text-center text-[11px] font-semibold tracking-[0.12em] text-[#fbe9df]"} data-testid="text-disclaimer">TRANG WEBSITE ĐỘC LẬP • KHÔNG THU THẬP DỮ LIỆU</div>
      <div className="bg-[#c87f5f]">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <nav aria-label="Điều hướng trang" className="mb-4 flex flex-wrap gap-2">
            {back && <Link href={back.href} data-testid="link-back" className={lc}><ChevronLeft className="size-4" />{back.label}</Link>}
            <Link href={ROUTES.home} data-testid="link-home" className={lc}><Home className="size-4" />Trang chủ</Link>
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold tracking-wide text-white">{title}</h1>
          {subtitle && <p className="mt-1 text-white/90">{subtitle}</p>}
        </div>
      </div>
      <main className="mx-auto max-w-4xl px-4 py-10">{children}</main>
      {showFooterNotice && <footer className="bg-[#853e3b] px-4 py-4 text-center text-xs leading-5 text-[#fbe9df]/85">Trang website độc lập, không thu thập dữ liệu.</footer>}
    </div>
  );
}
