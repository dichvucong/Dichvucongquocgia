import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useClerk, useUser } from '@clerk/react';
import { ExternalLink, Images, LogOut, UsersRound } from 'lucide-react';
import { ROUTES, publicSiteUrl } from '@/lib/routes';
import { basePath } from '@/lib/clerk';

function Brand() {
  return (
    <Link href={ROUTES.adminImages} className="flex items-center gap-3" data-testid="link-admin-brand">
      <img src={`${basePath}/logo.svg`} alt="" className="size-9" />
      <span className="leading-tight">
        <span className="block text-[15px] font-bold tracking-tight text-[#f4efe6]">Bàn điều phối ảnh</span>
        <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#6f9e95]">Khu quản trị độc lập</span>
      </span>
    </Link>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const email = user?.primaryEmailAddress?.emailAddress;
  const nav = [
    { href: ROUTES.adminImages, label: 'Ảnh công khai', icon: Images },
    { href: ROUTES.adminProfiles, label: 'Hồ sơ cục bộ', icon: UsersRound },
  ];
  const logout = () => signOut({ redirectUrl: `${window.location.origin}${basePath}/` });
  return (
    <div className="min-h-[100dvh] bg-[#f4efe6] text-[#1d2a2c]">
      <div className="bg-[#c8553d] px-4 py-1 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#fbf8f2]">Khu vực quản trị · Không phải hệ thống chính thức</div>
      <div className="md:flex">
        <aside className="bg-[#1d2a2c] text-[#f4efe6] md:sticky md:top-0 md:flex md:h-[100dvh] md:w-64 md:shrink-0 md:flex-col">
          <div className="flex items-center justify-between gap-3 px-5 py-4 md:py-6"><Brand /></div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0" aria-label="Điều hướng quản trị">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} data-testid={`nav-admin-${href.split('/').pop() || 'overview'}`}
                className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${location === href ? 'bg-[#f4efe6] font-semibold text-[#1d2a2c]' : 'text-[#f4efe6]/75 hover:bg-white/5 hover:text-[#f4efe6]'}`}>
                <Icon className="size-4" />{label}
              </Link>
            ))}
            <a href={publicSiteUrl()} data-testid="link-admin-public-page" className="flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-[#f4efe6]/75 hover:bg-white/5 hover:text-[#f4efe6]">
              <ExternalLink className="size-4" />Trang tra cứu công khai
            </a>
          </nav>
          <div className="hidden border-t border-white/10 p-4 md:mt-auto md:block">
            {email && <p className="truncate font-mono text-[11px] text-[#f4efe6]/60" data-testid="text-admin-email">{email}</p>}
            <button type="button" data-testid="button-sign-out" onClick={logout} className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#f4efe6]/80 hover:bg-white/5">
              <LogOut className="size-4" />Đăng xuất
            </button>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 border-b border-[#1d2a2c]/10 px-4 py-2 md:hidden">
            <span className="truncate font-mono text-[11px] text-[#5a6466]">{email ?? ''}</span>
            <button type="button" data-testid="button-sign-out-mobile" onClick={logout} className="flex items-center gap-1.5 rounded px-2 py-1 text-sm text-[#1d2a2c]"><LogOut className="size-4" />Đăng xuất</button>
          </div>
          <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
