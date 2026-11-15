import { Link } from 'wouter';
import { ArrowRight, Eye, Lock, Upload } from 'lucide-react';
import { ROUTES, publicSiteUrl } from '@/lib/routes';
import { basePath } from '@/lib/clerk';
import { useDocumentTitle } from '@/lib/use-document-title';

const steps = [
  { icon: Upload, title: 'Tải lên & xem trước', description: 'Chọn ảnh từ thiết bị, kiểm tra tại chỗ, đặt tiêu đề rồi lưu bản nháp.' },
  { icon: Eye, title: 'Công khai một ảnh', description: 'Chỉ một ảnh hiển thị tại một thời điểm trên trang tra cứu dùng chung.' },
  { icon: Lock, title: 'Quyền do máy chủ cấp', description: 'Đăng ký không tự động có quyền. Chỉ tài khoản được phê duyệt mới quản lý.' },
];

export default function AdminLandingPage() {
  useDocumentTitle('Khu quản trị');
  return (
    <div className="min-h-[100dvh] overflow-hidden bg-[#1d2a2c] text-[#f4efe6]">
      <div className="bg-[#c8553d] px-4 py-1 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#fbf8f2]">Khu vực quản trị · Không phải hệ thống chính thức</div>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-3"><img src={`${basePath}/logo.svg`} alt="" className="size-9" /><span className="font-bold">Bàn điều phối ảnh</span></div>
        <a href={publicSiteUrl()} data-testid="link-admin-to-home" className="text-sm text-[#f4efe6]/70 transition hover:text-[#f4efe6]">Trang công khai</a>
      </header>
      <main className="mx-auto grid max-w-6xl gap-12 px-5 pb-16 pt-8 md:grid-cols-[1.2fr_1fr] md:pt-16">
        <section className="animate-rise-in">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#6f9e95]">Khu quản trị độc lập</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">Một ảnh.<br /><span className="text-[#e8b04b]">Mọi người</span> cùng thấy.</h1>
          <p className="mt-6 max-w-lg text-[#f4efe6]/70">Nơi quản trị viên được phê duyệt chọn ảnh duy nhất hiển thị trên trang tra cứu dùng chung. Thay đổi đến người xem gần như ngay lập tức.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={ROUTES.signIn} data-testid="link-admin-sign-in" className="flex items-center gap-2 rounded-lg bg-[#c8553d] px-5 py-3 font-semibold text-[#fbf8f2] transition hover:bg-[#b2462f]">Đăng nhập<ArrowRight className="size-4" /></Link>
            <Link href={ROUTES.signUp} data-testid="link-admin-sign-up" className="rounded-lg border border-white/20 px-5 py-3 font-medium transition hover:bg-white/5">Tạo tài khoản</Link>
          </div>
          <div className="mt-14 flex items-center gap-3 border-t border-white/10 pt-5 text-xs text-[#f4efe6]/55">
            <span className="size-2 rounded-full bg-[#6f9e95]" />Mọi thay đổi quyền được xác nhận ở phía máy chủ.
          </div>
        </section>
        <section className="self-end">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[#e8b04b]">Quy trình quản lý</p>
          <ol className="space-y-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return <li key={step.title} className="animate-rise-in flex gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4" style={{ animationDelay: `${index * 90}ms` }}>
                <span className="pt-0.5 font-mono text-xs text-[#6f9e95]">0{index + 1}</span>
                <div><p className="flex items-center gap-2 font-semibold"><Icon className="size-4 text-[#e8b04b]" />{step.title}</p><p className="mt-1 text-sm text-[#f4efe6]/60">{step.description}</p></div>
              </li>;
            })}
          </ol>
        </section>
      </main>
      <footer className="mx-auto flex max-w-6xl flex-col gap-3 border-t border-white/10 px-5 py-5 text-xs text-[#f4efe6]/45 sm:flex-row sm:items-center sm:justify-between">
        <span>Cổng thông tin dịch vụ · Bàn điều phối ảnh</span>
        <span className="font-mono uppercase tracking-wider">Admin workspace / 01</span>
      </footer>
    </div>
  );
}
