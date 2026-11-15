import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { useClerk } from '@clerk/react';
import { AlertTriangle, ArrowRight, LogOut, RefreshCw, Settings2, ShieldX } from 'lucide-react';
import { getGetAdminSessionQueryKey, useGetAdminSession } from '@workspace/api-client-react';
import { errorMessage, errorStatus } from '@/lib/errors';
import { basePath } from '@/lib/clerk';
import { ROUTES } from '@/lib/routes';

function Panel({ icon, title, children, testId }: { icon: ReactNode; title: string; children: ReactNode; testId: string }) {
  const { signOut } = useClerk();
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#f4efe6] px-4" data-testid={testId}>
      <div className="w-full max-w-md rounded-2xl border border-[#1d2a2c]/10 bg-[#fbf8f2] p-6 shadow-[0_20px_50px_-30px_rgba(29,42,44,0.5)]">
        <div className="grid size-12 place-items-center rounded-xl bg-[#1d2a2c] text-[#e8b04b]">{icon}</div>
        <h1 className="mt-4 text-xl font-bold text-[#1d2a2c]">{title}</h1>
        <div className="mt-2 space-y-3 text-sm text-[#5a6466]">{children}</div>
        <div className="mt-6 flex flex-wrap gap-2">
          <a href={`${window.location.origin}/`} data-testid="link-gate-home" className="rounded-lg border border-[#1d2a2c]/20 px-3 py-2 text-sm">Trang công khai</a>
          <button onClick={() => signOut({ redirectUrl: `${window.location.origin}${basePath}/` })} data-testid="button-gate-sign-out" className="flex items-center gap-1.5 rounded-lg bg-[#1d2a2c] px-3 py-2 text-sm text-[#f4efe6]"><LogOut className="size-4" />Đăng xuất</button>
          <Link href={ROUTES.signIn} className="flex items-center gap-1.5 rounded-lg bg-[#c8553d] px-3 py-2 text-sm font-medium text-[#fbf8f2]">Đăng nhập<ArrowRight className="size-4" /></Link>
        </div>
      </div>
    </div>
  );
}

export function AdminGate({ children }: { children: ReactNode }) {
  const { data, isLoading, isError, error, refetch, isFetching } = useGetAdminSession({
    query: { queryKey: getGetAdminSessionQueryKey(), retry: false },
  });
  if (isLoading) return (
    <div className="flex min-h-[100dvh] bg-[#f4efe6]" data-testid="state-admin-loading">
      <div className="hidden w-64 bg-[#1d2a2c] md:block" />
      <div className="flex-1 space-y-4 p-8"><div className="h-8 w-56 animate-pulse rounded bg-[#e9e3d6]" /><div className="h-72 animate-pulse rounded-2xl bg-[#e9e3d6]" /></div>
    </div>
  );
  if (isError) {
    if (errorStatus(error) === 401) return <Panel testId="state-admin-unauth" icon={<ShieldX className="size-6" />} title="Phiên chưa được xác nhận"><p>Máy chủ chưa nhận ra phiên đăng nhập của bạn. Hãy đăng xuất rồi đăng nhập lại.</p></Panel>;
    return <Panel testId="state-admin-error" icon={<AlertTriangle className="size-6" />} title="Không kiểm tra được quyền">
      <p>{errorMessage(error)}</p>
      <button onClick={() => refetch()} disabled={isFetching} data-testid="button-retry-session" className="flex items-center gap-1.5 rounded-lg bg-[#c8553d] px-3 py-1.5 text-[#fbf8f2] disabled:opacity-50"><RefreshCw className="size-4" />Thử lại</button>
    </Panel>;
  }
  if (data && !data.configured) return <Panel testId="state-admin-not-configured" icon={<Settings2 className="size-6" />} title="Khu quản trị chưa được cấu hình">
    <p>Máy chủ chưa có danh sách quản trị viên được phê duyệt, nên chưa ai có thể quản lý ảnh công khai.</p>
    <p>Người vận hành hệ thống cần chỉ định email quản trị viên ở phía máy chủ. Hệ thống không tự cấp quyền cho tài khoản đầu tiên.</p>
  </Panel>;
  if (!data?.isAdmin) return <Panel testId="state-admin-denied" icon={<ShieldX className="size-6" />} title="Không có quyền truy cập">
    <p>Bạn đã đăng nhập, nhưng tài khoản này chưa được máy chủ phê duyệt làm quản trị viên.</p>
    <p>Nếu cần quyền, hãy liên hệ người vận hành hệ thống.</p>
  </Panel>;
  return <>{children}</>;
}
