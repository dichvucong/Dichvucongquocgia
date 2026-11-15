import { FileText, ChevronRight } from "lucide-react";
import { KE_KHAI_TOPICS, type InfoView } from "@/lib/ke-khai";

export function KeKhaiResults({ onOpen }: { onOpen: (v: InfoView) => void }) {
  return (
    <section aria-label="Kết quả tìm kiếm Kê khai" data-testid="section-ke-khai" className="mt-6 rounded bg-white/95 p-4 animate-in fade-in slide-in-from-top-1">
      <h2 className="text-lg font-semibold text-[#a5483a]">Kết quả cho “Kê khai”</h2>
      <p className="mb-3 text-sm text-[#5e5450]">Chọn một mục để xem thông tin tham khảo.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {KE_KHAI_TOPICS.map((t) => (
          <button key={t.id} type="button" data-testid={`button-ke-khai-${t.id}`} onClick={() => onOpen(t)}
            className="group flex items-center gap-3 rounded-lg bg-[#f2f2f2] px-4 py-3 text-left text-[16px] transition-all hover:bg-[#efe3dc] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c87f5f]">
            <FileText className="size-6 shrink-0 text-[#c87f5f]" strokeWidth={1.4} />
            <span className="flex-1">{t.title}</span>
            <ChevronRight className="size-4 text-[#b9aaa3]" />
          </button>
        ))}
      </div>
    </section>
  );
}
