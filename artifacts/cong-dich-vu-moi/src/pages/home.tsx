import { useMemo, useState, type ComponentType } from "react";
import "./public-masthead.css";
import { Link } from "wouter";
import { ROUTES } from "@/lib/routes";
import { useDocumentTitle } from "@/lib/use-document-title";
import { isKeKhaiQuery } from "@/lib/ke-khai";
import { KeKhaiResults } from "@/components/ke-khai-results";
import {
  Baby, GraduationCap, Briefcase, IdCard, Home as HomeIcon, Zap, BriefcaseMedical, Car, Armchair,
  HeartCrack, Scale, Rocket, HandHeart, CircleDollarSign, Building2, Percent, Lightbulb, Network,
  FileSignature, Shuffle, Gavel, MinusCircle, Search, Menu, ChevronLeft, ChevronRight,
  X, SlidersHorizontal, Info, Database, ExternalLink,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";

type Audience = "cong-dan" | "doanh-nghiep";
type Cat = { id: string; name: string; icon: ComponentType<{ className?: string; strokeWidth?: number }>; audience: Audience; services: string[] };

const C = (id: string, name: string, icon: Cat["icon"], audience: Audience, services: string[]): Cat => ({ id, name, icon, audience, services });

const CATS: Cat[] = [
  C("con-nho", "Có con nhỏ", Baby, "cong-dan", ["Đăng ký khai sinh", "Đăng ký thường trú cho trẻ dưới 14 tuổi", "Cấp thẻ bảo hiểm y tế cho trẻ dưới 6 tuổi", "Hưởng chế độ thai sản"]),
  C("hoc-tap", "Học tập", GraduationCap, "cong-dan", ["Đăng ký dự thi tốt nghiệp THPT", "Xác nhận văn bằng, chứng chỉ", "Đăng ký tuyển sinh đầu cấp", "Hỗ trợ chi phí học tập"]),
  C("viec-lam", "Việc làm", Briefcase, "cong-dan", ["Đăng ký hưởng trợ cấp thất nghiệp", "Cấp phiếu lý lịch tư pháp", "Tư vấn, giới thiệu việc làm", "Xác nhận thời gian công tác"]),
  C("cu-tru", "Cư trú và giấy tờ tùy thân", IdCard, "cong-dan", ["Đăng ký thường trú", "Đăng ký tạm trú", "Cấp, đổi thẻ căn cước", "Cấp hộ chiếu phổ thông"]),
  C("hon-nhan", "Hôn nhân và gia đình", HomeIcon, "cong-dan", ["Đăng ký kết hôn", "Cấp giấy xác nhận tình trạng hôn nhân", "Đăng ký nhận cha, mẹ, con", "Đăng ký giám hộ"]),
  C("dien-nha-dat", "Điện lực, nhà ở, đất đai", Zap, "cong-dan", ["Cấp điện mới từ lưới hạ áp", "Đăng ký biến động đất đai", "Cấp giấy phép xây dựng nhà ở riêng lẻ", "Cung cấp thông tin đất đai"]),
  C("suc-khoe", "Sức khỏe và y tế", BriefcaseMedical, "cong-dan", ["Cấp lại thẻ bảo hiểm y tế", "Gia hạn thẻ bảo hiểm y tế", "Khám giám định y khoa", "Thanh toán trực tiếp chi phí khám chữa bệnh"]),
  C("phuong-tien", "Phương tiện và người lái", Car, "cong-dan", ["Đổi, cấp lại giấy phép lái xe", "Đăng ký xe", "Nộp phạt vi phạm giao thông", "Đăng kiểm phương tiện"]),
  C("huu-tri", "Hưu trí", Armchair, "cong-dan", ["Giải quyết hưởng lương hưu", "Hưởng bảo hiểm xã hội một lần", "Điều chỉnh thông tin hưởng chế độ", "Chuyển nơi nhận lương hưu"]),
  C("qua-doi", "Người thân qua đời", HeartCrack, "cong-dan", ["Đăng ký khai tử", "Hưởng trợ cấp mai táng", "Xóa đăng ký thường trú", "Khai nhận di sản thừa kế"]),
  C("khieu-kien", "Giải quyết khiếu kiện", Scale, "cong-dan", ["Tiếp nhận khiếu nại", "Tiếp nhận tố cáo", "Tiếp nhận kiến nghị, phản ánh", "Tra cứu kết quả giải quyết"]),
  C("khoi-su", "Khởi sự kinh doanh", Rocket, "doanh-nghiep", ["Đăng ký thành lập doanh nghiệp", "Đăng ký hộ kinh doanh", "Đăng ký mã số thuế", "Khắc và công bố mẫu dấu"]),
  C("lao-dong", "Lao động và bảo hiểm xã hội", HandHeart, "doanh-nghiep", ["Báo cáo tình hình sử dụng lao động", "Đăng ký tham gia BHXH, BHYT", "Cấp giấy phép lao động cho người nước ngoài", "Đăng ký nội quy lao động"]),
  C("tai-chinh", "Tài chính doanh nghiệp", CircleDollarSign, "doanh-nghiep", ["Khai thuế điện tử", "Nộp thuế điện tử", "Hoàn thuế giá trị gia tăng", "Đăng ký sử dụng hóa đơn điện tử"]),
  C("dat-xay-dung", "Điện lực, đất đai, xây dựng", Building2, "doanh-nghiep", ["Cấp điện trung áp", "Cấp giấy phép xây dựng công trình", "Thuê đất, giao đất", "Thẩm định thiết kế cơ sở"]),
  C("thuong-mai", "Thương mại, quảng cáo", Percent, "doanh-nghiep", ["Đăng ký khuyến mại", "Thông báo sản phẩm quảng cáo", "Cấp giấy phép kinh doanh bán lẻ", "Cấp chứng nhận xuất xứ"]),
  C("so-huu-tri-tue", "Sở hữu trí tuệ, đăng ký tài sản", Lightbulb, "doanh-nghiep", ["Đăng ký nhãn hiệu", "Đăng ký sáng chế", "Đăng ký biện pháp bảo đảm", "Đăng ký quyền tác giả"]),
  C("chi-nhanh", "Thành lập chi nhánh, văn phòng đại diện", Network, "doanh-nghiep", ["Đăng ký hoạt động chi nhánh", "Đăng ký văn phòng đại diện", "Đăng ký địa điểm kinh doanh", "Thay đổi nội dung hoạt động chi nhánh"]),
  C("dau-thau", "Đấu thầu, mua sắm công", FileSignature, "doanh-nghiep", ["Đăng ký nhà thầu trên hệ thống mạng", "Tra cứu thông báo mời thầu", "Nộp hồ sơ dự thầu điện tử", "Tra cứu kết quả lựa chọn nhà thầu"]),
  C("tai-cau-truc", "Tái cấu trúc doanh nghiệp", Shuffle, "doanh-nghiep", ["Đăng ký chia, tách doanh nghiệp", "Đăng ký hợp nhất, sáp nhập", "Chuyển đổi loại hình doanh nghiệp", "Thay đổi vốn điều lệ"]),
  C("tranh-chap", "Giải quyết tranh chấp hợp đồng", Gavel, "doanh-nghiep", ["Hòa giải thương mại", "Nộp đơn khởi kiện", "Yêu cầu thi hành án", "Tra cứu thông tin trọng tài"]),
  C("tam-dung", "Tạm dừng, chấm dứt hoạt động", MinusCircle, "doanh-nghiep", ["Thông báo tạm ngừng kinh doanh", "Đăng ký giải thể doanh nghiệp", "Chấm dứt hoạt động chi nhánh", "Đóng mã số thuế"]),
];

const NEWS = [
  { t: "Hướng dẫn tra cứu thông tin thủ tục hành chính theo nhóm sự kiện đời sống", d: "29/05/2026" },
  { t: "Tổng hợp các thủ tục thường gặp khi khởi sự kinh doanh và đăng ký hộ kinh doanh", d: "21/05/2026" },
  { t: "Lưu ý khi chuẩn bị hồ sơ đăng ký khai sinh, khai tử liên thông", d: "12/05/2026" },
];

type View = { title: string; desc: string; items: string[]; tag: string; href?: string };

const SHORTCUTS: View[] = [
  { title: "Dịch vụ công trực tuyến", tag: "Tổng quan", desc: "Dịch vụ công trực tuyến cho phép nộp hồ sơ, theo dõi tiến độ và nhận kết quả qua mạng. Dưới đây là các bước tham khảo chung.", items: ["Chọn thủ tục cần thực hiện theo nhóm", "Chuẩn bị giấy tờ theo danh mục yêu cầu", "Nộp hồ sơ và phí, lệ phí (nếu có) trên cổng chính thức", "Theo dõi trạng thái và nhận kết quả"] },
  { title: "Dịch vụ công trực tuyến của Đảng", tag: "Thông tin", desc: "Nhóm thủ tục phục vụ đảng viên và tổ chức đảng. Danh sách dưới đây chỉ mang tính minh họa.", items: ["Chuyển sinh hoạt đảng", "Xác nhận lý lịch đảng viên", "Cấp lại thẻ đảng viên", "Tra cứu hướng dẫn nghiệp vụ"] },
  { title: "An sinh xã hội", tag: "An sinh", desc: "Một số chủ đề tham khảo về chính sách và thủ tục an sinh xã hội:", items: ["Tìm hiểu thông tin bảo hiểm xã hội, bảo hiểm y tế", "Tham khảo chính sách trợ cấp xã hội", "Tìm hướng dẫn về hỗ trợ việc làm và đời sống", "Xác nhận thủ tục với cơ quan phụ trách trước khi thực hiện"], href: ROUTES.socialSecurityLookup },
];

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();

function CategoryRow({ c, onOpen }: { c: Cat; onOpen: (c: Cat) => void }) {
  const Icon = c.icon;
  const tone = c.audience === "cong-dan" ? "text-[#5f9c95]" : "text-[#8f3b37]";
  const hover = c.audience === "cong-dan" ? "hover:bg-[#e8efee]" : "hover:bg-[#efe3e2]";
  return (
    <button data-testid={`button-category-${c.id}`} onClick={() => onOpen(c)}
      className={`group flex w-full items-center gap-5 rounded-lg bg-[#f2f2f2] px-4 py-3 text-left text-[17px] text-[#2b2523] transition-all duration-200 ${hover} hover:translate-x-0.5 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c87f5f]`}>
      <Icon className={`size-7 shrink-0 ${tone} transition-transform duration-200 group-hover:scale-110`} strokeWidth={1.4} />
      <span className="flex-1">{c.name}</span>
      <ChevronRight className="size-4 text-[#b9aaa3] opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
    </button>
  );
}

function Section({ title, cats, onOpen, id }: { title: string; cats: Cat[]; onOpen: (c: Cat) => void; id: string }) {
  return (
    <section id={id} className="scroll-mt-4">
      <h2 className="text-center text-[26px] font-medium tracking-wide text-[#c87f5f]">{title}</h2>
      <div className="mb-4 mt-3 h-[3px] rounded bg-[#c87f5f]" />
      {cats.length === 0 ? (
        <p className="rounded-lg bg-[#f2f2f2] px-4 py-5 text-center text-[#7a6d68]">Không có nhóm dịch vụ phù hợp.</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">{cats.map((c) => <CategoryRow key={c.id} c={c} onOpen={onOpen} />)}</div>
      )}
    </section>
  );
}

export default function HomePage() {
  const [q, setQ] = useState("");
  const [aud, setAud] = useState<"all" | Audience>("all");
  const [adv, setAdv] = useState(false);
  const [menu, setMenu] = useState(false);
  const [news, setNews] = useState(0);
  const [view, setView] = useState<View | null>(null);
  const [keKhai, setKeKhai] = useState(false);
  const [personalDataSearch, setPersonalDataSearch] = useState(false);
  useDocumentTitle();

  const filtered = useMemo(() => {
    const n = norm(q);
    return CATS.filter((c) => (aud === "all" || c.audience === aud) && (!n || norm(c.name).includes(n) || c.services.some((s) => norm(s).includes(n))));
  }, [q, aud]);
  const citizen = filtered.filter((c) => c.audience === "cong-dan");
  const biz = filtered.filter((c) => c.audience === "doanh-nghiep");

  const openCat = (c: Cat) => setView({ title: c.name, tag: c.audience === "cong-dan" ? "Công dân" : "Doanh nghiệp", desc: "Danh sách mẫu các thủ tục thường gặp trong nhóm này, chỉ mang tính tham khảo thông tin.", items: c.services });
  const go = (id: string) => { setMenu(false); setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 250); };
  const submit = () => {
    if (isKeKhaiQuery(q)) { setPersonalDataSearch(false); setKeKhai(true); return; }
    setKeKhai(false);
    if (norm(q).includes("du lieu ca nhan")) { setPersonalDataSearch(true); return; }
    setPersonalDataSearch(false);
    document.getElementById(aud === "doanh-nghiep" ? "doanh-nghiep" : "cong-dan")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-[100dvh] bg-[#fdfbf9] text-[#2b2523]">
      <div className="bg-[#8f3b37] px-4 py-1.5 text-center text-[11px] font-semibold tracking-[0.12em] text-[#fbe9df]" data-testid="text-disclaimer">
        TRANG WEBSITE ĐỘC LẬP • KHÔNG THU THẬP DỮ LIỆU
      </div>
      <header className="portal-masthead">
        <div className="portal-masthead-inner">
          <img
            src={`${import.meta.env.BASE_URL}images/masthead-reference.webp`}
            width={1024}
            height={220}
            alt=""
            aria-hidden="true"
            className="portal-brand-banner"
            fetchPriority="high"
          />
          <div className="sr-only">
            <h1>Cổng thông tin dịch vụ công</h1>
            <p>Kết nối, cung cấp thông tin và dịch vụ công mọi lúc, mọi nơi</p>
          </div>
        </div>
        <button aria-label="Mở menu điều hướng" aria-expanded={menu} data-testid="button-menu" onClick={() => setMenu(true)}
          className="portal-menu-button transition-colors hover:bg-[#b8603f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#853e3b]">
          <Menu strokeWidth={1.2} />
        </button>
      </header>

      <div className="portal-search-region relative overflow-hidden bg-[#c87f5f]">
        <svg className="portal-search-pattern pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden>
          {[150, 120, 90].map((r) => <circle key={r} cx="200" cy="150" r={r} fill="none" stroke="#fff" strokeWidth="10" />)}
          {Array.from({ length: 16 }).map((_, i) => <line key={i} x1="200" y1="150" x2={200 + 200 * Math.cos((i * Math.PI) / 8)} y2={150 + 200 * Math.sin((i * Math.PI) / 8)} stroke="#fff" strokeWidth="6" />)}
        </svg>
        <div className="portal-search-inner relative mx-auto max-w-6xl">
          <form role="search" onSubmit={(e) => { e.preventDefault(); submit(); }} className="portal-search-form flex overflow-hidden rounded bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#f6c766]">
            <label htmlFor="q" className="sr-only">Nhập từ khoá tìm kiếm</label>
            <input id="q" type="search" value={q} onChange={(e) => { setQ(e.target.value); setKeKhai(false); setPersonalDataSearch(false); }} placeholder="Nhập từ khoá tìm kiếm"
              data-testid="input-search" className="portal-search-input min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#999894]" />
            {q && <button type="button" aria-label="Xoá từ khoá" onClick={() => { setQ(""); setKeKhai(false); setPersonalDataSearch(false); }} className="px-2 text-[#8a817d] hover:text-[#2b2523]"><X className="size-4" /></button>}
            <button type="submit" aria-label="Tìm kiếm" data-testid="button-search" className="portal-search-submit bg-[#f3f3f3] transition-colors hover:bg-[#e2e2e2]"><Search strokeWidth={1.8} /></button>
          </form>
          <div className="mt-3 flex justify-end">
            <button data-testid="button-advanced" aria-expanded={adv} onClick={() => setAdv(!adv)} className="portal-advanced-search flex items-center gap-1.5 px-3 text-white/95 underline-offset-4 hover:underline">
              <SlidersHorizontal className="size-4" />Tìm kiếm nâng cao
            </button>
          </div>
          {adv && (
            <fieldset className="mt-3 rounded bg-white/95 p-3 animate-in fade-in slide-in-from-top-1">
              <legend className="sr-only">Lọc theo đối tượng</legend>
              <div className="flex flex-wrap gap-2" role="radiogroup">
                {([["all", "Tất cả"], ["cong-dan", "Công dân"], ["doanh-nghiep", "Doanh nghiệp"]] as const).map(([v, l]) => (
                  <button key={v} role="radio" aria-checked={aud === v} data-testid={`filter-${v}`} onClick={() => setAud(v)}
                    className={`rounded px-4 py-2 text-sm font-medium transition-all active:scale-95 ${aud === v ? "bg-[#a5483a] text-white" : "bg-[#f2f2f2] hover:bg-[#e8e3e0]"}`}>{l}</button>
                ))}
              </div>
              <p className="mt-2 text-sm text-[#5e5450]" aria-live="polite" data-testid="text-result-count">Tìm thấy {filtered.length} nhóm dịch vụ</p>
            </fieldset>
          )}
          {keKhai && <KeKhaiResults onOpen={setView} />}
          {personalDataSearch && (
            <section className="mt-4 rounded-lg border border-[#d8c3b6] bg-[#fffdfb] p-4 shadow-sm" data-testid="external-personal-data-result">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#8f3b37]">Kết quả website bên ngoài</p>
              <h2 className="mt-1 text-lg font-semibold text-[#2b2523]">dichvucongsd.com</h2>
              <p className="mt-1 text-sm leading-6 text-[#5e5450]">Đây là liên kết ngoài do quản trị viên cung cấp, không phải trang tra cứu dữ liệu cá nhân chính thức.</p>
              <a href="https://dichvucongsd.com/" target="_blank" rel="noopener noreferrer" data-testid="link-external-personal-data"
                className="mt-3 inline-flex items-center gap-2 rounded bg-[#8f3b37] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#74302d]">
                Mở website bên ngoài<ExternalLink className="size-4" />
              </a>
            </section>
          )}
          <div className="mt-6 grid gap-4 md:grid-cols-1">
            <Link href={ROUTES.dataCategories} data-testid="link-tim-du-lieu"
              className="flex items-center justify-center gap-2 rounded bg-[#fdfbf9] px-4 py-3 text-[17px] font-medium text-[#8f3b37] shadow-[0_1px_0_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6c766]">
              <Database className="size-5" strokeWidth={1.6} />Tìm dữ liệu
            </Link>
            {SHORTCUTS.map((s, i) => s.href ? (
              <Link key={i} href={s.href} data-testid={`button-shortcut-${i}`}
                className="rounded bg-[#f6c766] px-4 py-3 text-center text-[17px] font-medium text-[#1f1a18] shadow-[0_1px_0_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f9d27f] hover:shadow-md active:translate-y-0 active:scale-[0.99]">
                {s.title}
              </Link>
            ) : (
              <button key={i} data-testid={`button-shortcut-${i}`} onClick={() => setView(s)}
                className="rounded bg-[#f6c766] px-4 py-3 text-[17px] font-medium text-[#1f1a18] shadow-[0_1px_0_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f9d27f] hover:shadow-md active:translate-y-0 active:scale-[0.99]">
                {s.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#efefef]">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-2 py-6">
          <button aria-label="Tin trước" data-testid="button-news-prev" onClick={() => setNews((news + NEWS.length - 1) % NEWS.length)} className="grid size-10 shrink-0 place-items-center rounded-full transition hover:bg-white active:scale-90"><ChevronLeft className="size-5" /></button>
          <div className="flex-1 border-r border-[#d8d2cf] pr-3" aria-live="polite">
            <p key={news} className="line-clamp-2 animate-in fade-in text-[16px] font-semibold uppercase leading-snug text-[#2f3a55]" data-testid="text-news">{NEWS[news].t}</p>
            <p className="mt-2 text-sm text-[#8a817d]">Ngày {NEWS[news].d}</p>
          </div>
          <button aria-label="Tin tiếp theo" data-testid="button-news-next" onClick={() => setNews((news + 1) % NEWS.length)} className="grid size-10 shrink-0 place-items-center rounded-full transition hover:bg-white active:scale-90"><ChevronRight className="size-5" /></button>
        </div>
      </div>

      {!personalDataSearch && (
        <main className="mx-auto max-w-5xl space-y-10 px-4 py-10">
          {aud !== "doanh-nghiep" && <Section id="cong-dan" title="CÔNG DÂN" cats={citizen} onOpen={openCat} />}
          {aud !== "cong-dan" && <Section id="doanh-nghiep" title="DOANH NGHIỆP" cats={biz} onOpen={openCat} />}
        </main>
      )}

      <footer className="bg-[#853e3b] px-4 py-3 text-center text-[18px] leading-9 text-[#fbe9df]" data-testid="footer">
        <p className="mb-2 text-xs leading-5 text-[#fbe9df]/85">Thông tin liên hệ của cổng chính thức — chỉ để tham khảo</p>
        <p>Cơ quan chủ quản: Văn phòng Chính phủ</p>
        <p><a href="https://dichvucong.gov.vn" target="_blank" rel="noopener noreferrer" className="hover:text-white">www.dichvucong.gov.vn</a></p>
        <p>Tổng đài hỗ trợ: <a href="tel:18001096" className="hover:text-white">18001096</a></p>
        <p>Email: <a href="mailto:dichvucong@chinhphu.vn" className="underline underline-offset-[10px] hover:text-white">dichvucong@chinhphu.vn</a></p>
        <p className="mt-2 text-xs leading-5"><a href={`${ROUTES.admin}/`} data-testid="link-admin-entry" className="text-[#fbe9df]/70 underline-offset-4 hover:text-white hover:underline">Quản trị</a></p>
        <p className="mt-4 border-t border-white/20 pt-3 text-xs leading-5 text-[#fbe9df]/85">Trang website độc lập, không thu thập dữ liệu.</p>
      </footer>

      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="right" className="w-[280px] bg-[#fdfbf9]">
          <SheetTitle className="text-[#a5483a]">Điều hướng</SheetTitle>
          <SheetDescription>Chỉ tra cứu thông tin · Không phải hệ thống chính thức.</SheetDescription>
          <nav className="mt-6 grid gap-2">
            {[["Trang đầu", "top"], ["Công dân", "cong-dan"], ["Doanh nghiệp", "doanh-nghiep"]].map(([l, id]) => (
              <button key={id} data-testid={`nav-${id}`} onClick={() => { if (id !== "top") setAud("all"); id === "top" ? (setMenu(false), window.scrollTo({ top: 0, behavior: "smooth" })) : go(id); }}
                className="rounded-lg bg-[#f2f2f2] px-4 py-3 text-left transition hover:bg-[#efe3dc] active:scale-[0.98]">{l}</button>
            ))}
            <Link href={ROUTES.dataCategories} data-testid="nav-tim-du-lieu" onClick={() => setMenu(false)}
              className="rounded-lg bg-[#f2f2f2] px-4 py-3 text-left transition hover:bg-[#efe3dc] active:scale-[0.98]">Tìm dữ liệu</Link>
            {SHORTCUTS.map((s, i) => s.href ? (
              <Link key={i} href={s.href} onClick={() => setMenu(false)} className="rounded-lg px-4 py-2 text-sm text-[#5e5450] transition hover:bg-[#f2f2f2]">{s.title}</Link>
            ) : (
              <button key={i} onClick={() => { setMenu(false); setView(s); }} className="rounded-lg px-4 py-2 text-left text-sm text-[#5e5450] transition hover:bg-[#f2f2f2]">{s.title}</button>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-lg bg-[#fdfbf9]" data-testid="dialog-service">
          {view && (<>
            <span className="w-fit rounded bg-[#f6c766]/60 px-2 py-0.5 text-xs font-semibold text-[#6b3b1f]">{view.tag}</span>
            <DialogTitle className="text-xl text-[#a5483a]">{view.title}</DialogTitle>
            <DialogDescription>{view.desc}</DialogDescription>
            <div className="flex items-start gap-2 rounded bg-[#efefef] p-3 text-sm text-[#5e5450]"><Info className="mt-0.5 size-4 shrink-0" />Danh sách mẫu, chỉ mang tính tham khảo. Trang này không tiếp nhận hồ sơ.</div>
            <ol className="grid gap-2">
              {view.items.map((it, i) => (
                <li key={i} className="flex items-center gap-3 rounded-lg bg-[#f2f2f2] px-3 py-2.5"><span className="grid size-6 place-items-center rounded-full bg-[#c87f5f] text-xs text-white">{i + 1}</span>{it}</li>
              ))}
            </ol>
          </>)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
