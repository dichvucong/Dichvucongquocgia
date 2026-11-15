import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { SignIn, SignUp } from '@clerk/react';
import { ChevronLeft } from 'lucide-react';
import { basePath } from '@/lib/clerk';
import { ROUTES } from '@/lib/routes';

function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f4efe6]">
      <div className="bg-[#c8553d] px-4 py-1 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#fbf8f2]">Khu vực quản trị · Không phải hệ thống chính thức</div>
      <div className="px-4 py-3"><Link href={ROUTES.admin} data-testid="link-auth-back" className="inline-flex items-center gap-1 text-sm text-[#5a6466] hover:text-[#1d2a2c]"><ChevronLeft className="size-4" />Khu quản trị</Link></div>
      <div className="flex flex-1 items-center justify-center px-4 pb-10">{children}</div>
    </div>
  );
}

export function SignInPage() {
  return <AuthFrame><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} fallbackRedirectUrl={`${basePath}/images`} /></AuthFrame>;
}

export function SignUpPage() {
  return <AuthFrame><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} fallbackRedirectUrl={`${basePath}/images`} /></AuthFrame>;
}
