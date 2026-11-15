import { useState } from 'react';
import { AlertTriangle, ArrowUpRight, ImageOff, Loader2, RefreshCw, Replace, Send } from 'lucide-react';
import { getListAdminImagesQueryKey, useListAdminImages } from '@workspace/api-client-react';
import { useLiveCurrentImage } from '@/hooks/use-live-current-image';
import { useAdminMutations } from '@/hooks/use-admin-mutations';
import { useToast } from '@/hooks/use-toast';
import { errorMessage, formatDate } from '@/lib/errors';
import { publicSiteUrl } from '@/lib/routes';

export function CurrentPreview({ onReplace }: { onReplace: () => void }) {
  const { data, isLoading, isError, error, refetch, live } = useLiveCurrentImage();
  const { data: images } = useListAdminImages({
    query: { queryKey: getListAdminImagesQueryKey(), refetchInterval: 5000, refetchOnWindowFocus: true },
  });
  const { publish } = useAdminMutations();
  const { toast } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const image = data?.image ?? null;
  const drafts = images?.filter((candidate) => candidate.status === 'draft') ?? [];

  const publishDraft = async (id: string, title: string) => {
    setPendingId(id);
    try {
      await publish.mutateAsync({ id });
      toast({ title: 'Đã công khai', description: `“${title}” đang hiển thị trên trang tra cứu.` });
    } catch (cause) {
      toast({ title: 'Chưa công khai được ảnh', description: errorMessage(cause), variant: 'destructive' });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl bg-[#1d2a2c] text-[#f4efe6]" data-testid="section-current-public">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#6f9e95]">Đang hiển thị công khai</p>
          <h2 className="mt-1 text-lg font-semibold">Ảnh hiện tại trên trang tra cứu</h2>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[#f4efe6]/60">
          <span className={`size-2 rounded-full ${live ? 'animate-pulse bg-[#6f9e95]' : 'bg-[#e8b04b]'}`} />{live ? 'Trực tiếp' : 'Đang thăm dò'}
        </span>
      </div>
      <div className="p-5">
        {isLoading ? <div className="aspect-[4/3] animate-pulse rounded-xl bg-white/10" /> : isError ? (
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-xl border border-[#c8553d]/50 bg-[#c8553d]/10 p-4 text-center" role="alert">
            <AlertTriangle className="size-7 text-[#e8b04b]" />
            <p className="text-sm">{errorMessage(error, 'Không tải được ảnh công khai.')}</p>
            <button onClick={() => refetch()} data-testid="button-retry-current" className="flex items-center gap-1.5 rounded-lg bg-[#f4efe6] px-3 py-1.5 text-sm font-medium text-[#1d2a2c]"><RefreshCw className="size-4" />Thử lại</button>
          </div>
        ) : image ? (
          <figure>
            <div className="overflow-hidden rounded-xl bg-black/30"><img key={image.url} src={image.url} alt={image.title} className="mx-auto max-h-[340px] w-full object-contain animate-in fade-in" data-testid="img-current-public" /></div>
            <figcaption className="mt-3">
              <p className="font-medium" data-testid="text-current-title">{image.title}</p>
              <p className="font-mono text-[11px] text-[#f4efe6]/55">Công khai lúc {formatDate(image.publishedAt)} · rev {data?.revision}</p>
            </figcaption>
          </figure>
        ) : (
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 text-center" data-testid="state-no-current">
            <ImageOff className="size-8 text-[#f4efe6]/40" />
            <p className="font-medium">Chưa có ảnh nào được công khai</p>
            <p className="max-w-xs text-sm text-[#f4efe6]/60">Trang tra cứu đang hiển thị trạng thái trống cho mọi người truy cập.</p>
          </div>
        )}
        {drafts.length > 0 && (
          <div className="mt-4 rounded-xl border border-[#e8b04b]/40 bg-[#e8b04b]/10 p-4" data-testid="section-pending-publication">
            <p className="font-semibold text-[#e8b04b]">Ảnh đã tải lên, chưa công khai</p>
            <p className="mt-1 text-sm text-[#f4efe6]/70">Chọn ảnh bên dưới rồi bấm Công khai. Không cần tải ảnh lên lại.</p>
            <ul className="mt-3 space-y-2">
              {drafts.map((draft) => (
                <li key={draft.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm" title={draft.title}>{draft.title}</span>
                  <button
                    type="button"
                    onClick={() => void publishDraft(draft.id, draft.title)}
                    disabled={pendingId !== null}
                    data-testid={`button-publish-draft-${draft.id}`}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#e8b04b] px-3 py-2 text-sm font-semibold text-[#1d2a2c] disabled:cursor-wait disabled:opacity-60"
                  >
                    {pendingId === draft.id ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    Công khai
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={onReplace} data-testid="button-start-replace" className="flex items-center gap-1.5 rounded-lg bg-[#c8553d] px-3 py-2 text-sm font-medium text-[#fbf8f2] transition hover:bg-[#b2462f] active:scale-[0.98]">
            <Replace className="size-4" />{image ? 'Thay ảnh công khai' : 'Tải ảnh lên'}
          </button>
          <a href={publicSiteUrl()} data-testid="link-view-public" className="flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/5">
            Xem trang công khai<ArrowUpRight className="size-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
