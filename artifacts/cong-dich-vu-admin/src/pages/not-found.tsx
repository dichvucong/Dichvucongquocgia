import { Link } from 'wouter';
import { ArrowLeft, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f4efe6] px-5 text-[#1d2a2c]">
      <section className="w-full max-w-xl rounded-2xl border border-[#1d2a2c]/10 bg-[#fbf8f2] p-7 shadow-[0_24px_60px_-35px_rgba(29,42,44,.45)]">
        <div className="flex items-center gap-3 text-[#c8553d]"><Compass className="size-6" /><span className="font-mono text-xs uppercase tracking-[.2em]">Không tìm thấy trang</span></div>
        <p className="mt-7 font-mono text-6xl font-semibold tracking-[-.08em] text-[#1d2a2c]">404<span className="text-[#c8553d]">.</span></p>
        <h1 className="mt-2 text-2xl font-semibold">Lối này chưa có trong bản đồ.</h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-[#5a6466]">Địa chỉ có thể đã thay đổi hoặc không thuộc khu quản trị ảnh.</p>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#1d2a2c] px-4 py-2.5 text-sm font-medium text-[#f4efe6] transition hover:bg-[#2b3d40]"><ArrowLeft className="size-4" />Về khu quản trị</Link>
      </section>
    </main>
  );
}
