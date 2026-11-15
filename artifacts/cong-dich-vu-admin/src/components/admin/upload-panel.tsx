import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { FileImage, Loader2, Send, Save, Upload, X } from 'lucide-react';
import { useAdminMutations } from '@/hooks/use-admin-mutations';
import { useToast } from '@/hooks/use-toast';
import { putFile, validateFile, type AcceptedType } from '@/lib/upload';
import { errorMessage, formatBytes } from '@/lib/errors';

export type UploadPanelHandle = { openPicker: () => void };
type Phase = 'idle' | 'ticket' | 'uploading' | 'finalizing' | 'publishing';
const phaseLabels: Record<Phase, string> = {
  idle: '', ticket: 'Đang xin quyền tải lên…', uploading: 'Đang tải tệp lên kho lưu trữ…',
  finalizing: 'Đang xác nhận tệp…', publishing: 'Đang công khai ảnh…',
};

export const UploadPanel = forwardRef<UploadPanelHandle, { hasCurrent: boolean }>(function UploadPanel({ hasCurrent }, ref) {
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [percent, setPercent] = useState(0);
  const { requestUpload, complete, publish } = useAdminMutations();
  const { toast } = useToast();
  const busy = phase !== 'idle';

  useImperativeHandle(ref, () => ({
    openPicker: () => { rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); inputRef.current?.click(); },
  }));
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const pick = (next: File | undefined) => {
    if (!next) return;
    const validationError = validateFile(next);
    if (validationError) { setError(validationError); return; }
    setError(null);
    setFile(next);
    setPreview(URL.createObjectURL(next));
    if (!title) setTitle(next.name.replace(/\.[^.]+$/, '').slice(0, 150));
  };
  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setTitle('');
    setPercent(0);
    if (inputRef.current) inputRef.current.value = '';
  };
  const run = async (andPublish: boolean) => {
    if (!file) { setError('Hãy chọn một ảnh trước.'); return; }
    const cleanTitle = title.trim();
    if (!cleanTitle) { setError('Tiêu đề là bắt buộc.'); return; }
    setError(null);
    try {
      setPhase('ticket');
      const ticket = await requestUpload.mutateAsync({ data: {
        fileName: file.name.slice(0, 200),
        contentType: file.type as AcceptedType,
        size: file.size,
        title: cleanTitle,
      } });
      setPhase('uploading');
      setPercent(0);
      await putFile(ticket.uploadURL, file, setPercent);
      setPhase('finalizing');
      const image = await complete.mutateAsync({ id: ticket.uploadId });
      if (andPublish) {
        setPhase('publishing');
        await publish.mutateAsync({ id: image.id });
        toast({ title: 'Đã công khai', description: `“${image.title}” đang hiển thị trên trang tra cứu.` });
      } else {
        toast({ title: 'Đã lưu bản nháp', description: `“${image.title}” chưa hiển thị công khai.` });
      }
      reset();
    } catch (cause) {
      setError(errorMessage(cause, 'Tải ảnh lên thất bại.'));
    } finally {
      setPhase('idle');
    }
  };

  return (
    <section ref={rootRef} className="scroll-mt-6 rounded-2xl border border-[#1d2a2c]/10 bg-[#fbf8f2] p-5" data-testid="section-upload">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#c8553d]">{hasCurrent ? 'Thay thế / thêm mới' : 'Thêm mới'}</p>
      <h2 className="mt-1 text-lg font-semibold">Tải ảnh từ thiết bị</h2>
      <p className="mt-1 text-sm text-[#5a6466]">JPG, PNG hoặc WebP, tối đa 10 MB. Xem trước tại chỗ trước khi tải lên.</p>
      <p className="mt-2 rounded-lg bg-[#f6e9e2] p-3 text-sm text-[#7a2420]">Ảnh được công bố sẽ hiển thị cho mọi người. Không tải ảnh CCCD, hồ sơ cá nhân hoặc thông tin riêng tư. Lưu bản nháp chưa làm thay đổi ảnh công khai.</p>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" data-testid="input-file" onChange={(event) => pick(event.target.files?.[0])} disabled={busy} />
      {!file ? (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} data-testid="button-pick-file"
          onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); pick(event.dataTransfer.files?.[0]); }}
          className="mt-4 flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[#1d2a2c]/20 bg-[#f4efe6] px-4 py-10 text-center transition hover:border-[#c8553d] hover:bg-[#f6e9e2]">
          <Upload className="size-7 text-[#c8553d]" /><span className="font-medium">Chọn ảnh từ thiết bị</span><span className="text-xs text-[#5a6466]">hoặc kéo thả tệp vào đây</span>
        </button>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="relative overflow-hidden rounded-xl bg-[#1d2a2c]">
            {preview && <img src={preview} alt="Xem trước ảnh đã chọn" className="max-h-64 w-full object-contain" data-testid="img-local-preview" />}
            <span className="absolute left-2 top-2 rounded bg-[#1d2a2c]/80 px-2 py-0.5 font-mono text-[10px] uppercase text-[#e8b04b]">Xem trước cục bộ</span>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2 rounded-lg bg-[#f4efe6] px-3 py-2 text-sm">
              <FileImage className="mt-0.5 size-4 shrink-0 text-[#5a6466]" />
              <span className="min-w-0 flex-1"><span className="block truncate" data-testid="text-file-name">{file.name}</span><span className="font-mono text-[11px] text-[#5a6466]">{formatBytes(file.size)}</span></span>
              <button type="button" aria-label="Bỏ chọn ảnh" onClick={reset} disabled={busy} data-testid="button-clear-file" className="rounded p-0.5 hover:bg-[#e9e3d6] disabled:opacity-40"><X className="size-4" /></button>
            </div>
            <label className="text-sm font-medium" htmlFor="img-title">Tiêu đề <span className="text-[#c8553d]">*</span></label>
            <input id="img-title" value={title} maxLength={150} onChange={(event) => setTitle(event.target.value)} disabled={busy} required data-testid="input-title"
              className="-mt-1 rounded-lg border border-[#1d2a2c]/20 bg-white px-3 py-2 outline-none focus:border-[#c8553d] focus:ring-2 focus:ring-[#c8553d]/20" placeholder="Ví dụ: Thông báo tháng 6" />
            <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} data-testid="button-change-file" className="w-fit text-sm text-[#c8553d] underline-offset-4 hover:underline disabled:opacity-40">Chọn ảnh khác</button>
          </div>
        </div>
      )}
      {busy && <div className="mt-4" aria-live="polite" data-testid="status-upload-progress">
        <div className="flex justify-between text-xs text-[#5a6466]"><span>{phaseLabels[phase]}</span>{phase === 'uploading' && <span className="font-mono">{percent}%</span>}</div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#e9e3d6]"><div className={`h-full origin-left rounded-full bg-[#c8553d] transition-transform ${phase === 'uploading' ? '' : 'animate-pulse'}`} style={{ transform: `scaleX(${phase === 'uploading' ? percent / 100 : phase === 'ticket' ? 0.08 : 1})` }} /></div>
      </div>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-[#f6e3de] px-3 py-2 text-sm text-[#7a2420]" data-testid="text-upload-error">{error}</p>}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => void run(false)} disabled={busy || !file} data-testid="button-save-draft" className="flex items-center justify-center gap-1.5 rounded-lg border border-[#1d2a2c]/20 bg-white px-4 py-2.5 text-sm font-medium transition hover:bg-[#f4efe6] disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Lưu bản nháp
        </button>
        <button type="button" onClick={() => void run(true)} disabled={busy || !file} data-testid="button-upload-publish" className="flex items-center justify-center gap-1.5 rounded-lg bg-[#1d2a2c] px-4 py-2.5 text-sm font-semibold text-[#f4efe6] transition hover:bg-[#2b3d40] disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}{hasCurrent ? 'Tải lên & thay ảnh công khai' : 'Tải lên & công khai'}
        </button>
      </div>
    </section>
  );
});
