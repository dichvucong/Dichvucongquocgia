import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Download, ImageOff, Maximize2, RefreshCw, Search } from "lucide-react";
import { useLiveCurrentImage } from "@/hooks/use-live-current-image";
import { errorMessage, formatDate } from "@/lib/errors";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { findLocalProfileByNationalId, updateLocalProfile, type LocalProfile } from "@/lib/local-profile";

const DEMO_ID_RE = /^\d{12}$/;

function PublishedImage({ url, title, onOpen, onUnavailable }: { url: string; title: string; onOpen: () => void; onUnavailable: (failed: boolean) => void }) {
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  if (failed) return (
    <div role="alert" className="flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-center text-[#8f3b37]">
      <ImageOff className="size-7" />
      <p>Không tải được tệp ảnh. Nội dung có thể vừa được thay đổi hoặc kết nối bị gián đoạn.</p>
      <button className="rounded bg-[#8f3b37] px-4 py-2 text-white" onClick={() => { setRetry(n => n + 1); setFailed(false); onUnavailable(false); }}>Tải lại ảnh</button>
    </div>
  );
  return <img src={`${url}${retry ? `${url.includes("?") ? "&" : "?"}retry=${retry}` : ""}`} alt={title} role="button" tabIndex={0} aria-label={`Phóng to ảnh: ${title}`}
    onClick={onOpen} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
    onError={() => { setFailed(true); onUnavailable(true); }} className="mx-auto max-h-[70dvh] w-full cursor-zoom-in bg-[#f2f2f2] object-contain animate-in fade-in" data-testid="img-published" />;
}

function PublishedResult() {
  const { data, isLoading, isError, error, refetch, isFetching } = useLiveCurrentImage();
  const [fullscreen, setFullscreen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const currentUrl = data?.image?.url ?? null;
  useEffect(() => { setImageFailed(false); }, [currentUrl]);
  if (isLoading) return <div className="mt-6 h-72 animate-pulse rounded-lg bg-[#f2f2f2]" data-testid="state-lookup-loading" />;
  if (isError) {
    return (
      <div role="alert" className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-[#8f3b37]/30 bg-[#efe3e2] px-6 py-10 text-center text-[#5e3532]" data-testid="state-lookup-error">
        <AlertTriangle className="size-7" />
        <p className="font-semibold">Không tải được nội dung công khai</p>
        <p className="text-sm">{errorMessage(error)}</p>
        <button onClick={() => refetch()} disabled={isFetching} data-testid="button-lookup-retry" className="flex items-center gap-1.5 rounded bg-[#8f3b37] px-4 py-2 text-sm text-white disabled:opacity-50"><RefreshCw className="size-4" />Thử lại</button>
      </div>
    );
  }
  const img = data?.image ?? null;
  if (!img) {
    return (
      <div className="mt-6 flex flex-col items-center rounded-lg bg-[#f2f2f2] px-6 py-12 text-center" data-testid="state-lookup-empty">
        <div className="grid size-16 place-items-center rounded-full border-2 border-[#c87f5f] bg-[#fbf2ea] text-[#b8603f]"><ImageOff className="size-8" strokeWidth={1.5} /></div>
        <h3 className="mt-4 text-lg font-semibold text-[#a5483a]">Hiện chưa có nội dung công khai</h3>
        <p className="mt-2 max-w-md text-[#5e5450]">Quản trị viên chưa công khai ảnh nào, hoặc ảnh vừa được ẩn/xoá. Trang sẽ tự cập nhật khi có ảnh mới.</p>
      </div>
    );
  }
  return (
    <>
      <figure className="mt-6 overflow-hidden rounded-lg border border-[#e6dcd6] bg-white" data-testid="result-published-image">
        <div className="group relative bg-[#f2f2f2]">
          <PublishedImage key={img.url} url={img.url} title={img.title} onOpen={() => setFullscreen(true)} onUnavailable={setImageFailed} />
          {!imageFailed && <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-[#2b2523]/80 px-3 py-1.5 text-xs text-white opacity-100 transition group-hover:bg-[#2b2523] sm:opacity-0 sm:group-hover:opacity-100">
            <Maximize2 className="size-3.5" /> Phóng to
          </span>}
        </div>
        <figcaption className="border-t border-[#e6dcd6] px-4 py-3">
          <p className="font-semibold text-[#2b2523]" data-testid="text-published-title">{img.title}</p>
          <p className="text-xs text-[#7a6d68]">Ảnh công khai chung • cập nhật {formatDate(img.publishedAt)}</p>
        </figcaption>
      </figure>
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-5xl border-0 bg-[#2b2523] p-2 sm:p-4">
          <DialogTitle className="sr-only">{img.title}</DialogTitle>
          <DialogDescription className="sr-only">Ảnh công khai chung do quản trị viên đăng; không phải dữ liệu cá nhân.</DialogDescription>
          <img src={img.url} alt={img.title} className="mx-auto max-h-[82dvh] w-full object-contain" />
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DemoLookup() {
  const [value, setValue] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    const normalized = value.replace(/\D/g, "");
    if (!/^\d{12}$/.test(normalized)) {
      setProfile(null);
      setErr("Vui lòng nhập đúng 12 chữ số định danh.");
      return;
    }
    const next = findLocalProfileByNationalId(normalized);
    setValue("");
    if (!next) {
      setProfile(null);
      setErr("Không tìm thấy hồ sơ với số định danh này trên thiết bị.");
      return;
    }
    setErr(null);
    setUploadMessage(null);
    setProfile(next);
  }

  function handleAttachment(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadMessage("Chỉ chấp nhận tệp hình ảnh.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadMessage("Ảnh không được vượt quá 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string" || !profile) return;
      const updated: LocalProfile = {
        ...profile,
        attachment: {
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: reader.result,
          uploadedAt: new Date().toISOString(),
        },
      };
      updateLocalProfile(updated);
      setProfile(updated);
      setUploadMessage("Ảnh đã được lưu cục bộ vào hồ sơ trên thiết bị này.");
    };
    reader.readAsDataURL(file);
  }

  return (
    <section className="mt-0" aria-labelledby="profile-lookup-heading">
      <h2 id="profile-lookup-heading" className="sr-only">Nhập số định danh</h2>
      <form
        className="overflow-hidden rounded-lg border border-[#e0d6d0] bg-white shadow-sm focus-within:ring-2 focus-within:ring-[#f6c766]"
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        autoComplete="off"
      >
        <div className="flex">
          <label htmlFor="profile-code" className="sr-only">Số định danh (12 chữ số)</label>
          <input
            id="profile-code"
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => { setValue(e.target.value.replace(/\D/g, "").slice(0, 12)); setErr(null); }}
            placeholder="Nhập số định danh 12 chữ số"
            inputMode="numeric"
            maxLength={12}
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent px-4 py-3 font-mono text-lg tracking-[0.08em] outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-[#b5aaa5]"
          />
          <button type="submit" aria-label="Tra cứu" className="flex shrink-0 items-center gap-1.5 bg-[#c87f5f] px-4 text-white transition hover:bg-[#b8603f] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#853e3b]">
            <Search className="size-4" /><span className="hidden sm:inline">Tra cứu</span>
          </button>
        </div>
        <p className="px-4 pb-3 text-xs text-[#766660]">Nhập đúng số định danh đã lưu trong biểu mẫu để tìm hồ sơ trên trình duyệt này.</p>
      </form>
      {err && <p role="alert" className="mt-2 text-sm text-[#8f3b37]">{err}</p>}
      {profile && (
        <article className="mt-6 overflow-hidden rounded-lg border border-[#e0d6d0] bg-white shadow-sm">
          <div className="border-b border-[#e6dcd6] bg-[#f7eee8] px-4 py-3">
            <h3 className="font-semibold text-[#5e3532]">Hồ sơ {profile.id}</h3>
            <p className="text-xs text-[#766660]">Lưu cục bộ lúc {new Date(profile.savedAt).toLocaleString("vi-VN")}</p>
          </div>
          <dl className="grid gap-2 px-4 py-4 text-sm sm:grid-cols-2">
            {Object.entries(profile.fields).filter(([key]) => key !== "coverage").map(([key, val]) => (
              <div key={key} className="rounded bg-[#fbfaf8] px-3 py-2"><dt className="text-xs text-[#766660]">{key}</dt><dd className="font-medium text-[#2b2523]">{val}</dd></div>
            ))}
          </dl>
          <div className="border-t border-[#e6dcd6] px-4 py-4">
            <h4 className="font-semibold text-[#5e3532]">Ảnh đính kèm</h4>
            <p className="mt-1 text-xs text-[#766660]">Chỉ lưu trên trình duyệt này; tối đa 5MB, chỉ tệp hình ảnh.</p>
            <input className="mt-3 block w-full text-sm" type="file" accept="image/*" capture="environment" onChange={(e) => handleAttachment(e.target.files?.[0])} />
            {uploadMessage && <p role="status" className="mt-2 text-sm text-[#5e3532]">{uploadMessage}</p>}
            {profile.attachment && (
              <figure className="mt-4 overflow-hidden rounded border border-[#e6dcd6] bg-[#f2f2f2]">
                <img src={profile.attachment.dataUrl} alt={`Ảnh đính kèm ${profile.attachment.name}`} className="max-h-80 w-full object-contain" />
                <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e6dcd6] bg-white px-3 py-2 text-xs text-[#766660]">
                  <span className="break-all">{profile.attachment.name}</span>
                  <a
                    href={profile.attachment.dataUrl}
                    download={profile.attachment.name}
                    className="inline-flex items-center gap-1.5 rounded bg-[#c87f5f] px-3 py-2 font-semibold text-white transition hover:bg-[#b8603f]"
                  >
                    <Download className="size-3.5" /> Tải ảnh về điện thoại
                  </a>
                </figcaption>
              </figure>
            )}
          </div>
        </article>
      )}
    </section>
  );
}
