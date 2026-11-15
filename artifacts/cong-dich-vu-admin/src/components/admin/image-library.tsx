import { useState } from 'react';
import { AlertTriangle, Eye, EyeOff, ImagePlus, Loader2, RefreshCw, Send, Trash2 } from 'lucide-react';
import { getListAdminImagesQueryKey, useListAdminImages, type ManagedImage } from '@workspace/api-client-react';
import { useAdminMutations } from '@/hooks/use-admin-mutations';
import { useToast } from '@/hooks/use-toast';
import { StatusBadge } from './status-badge';
import { errorMessage, formatBytes, formatDate } from '@/lib/errors';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function ImageLibrary({ onUpload }: { onUpload: () => void }) {
  const { data, isLoading, isError, error, refetch } = useListAdminImages({
    query: { queryKey: getListAdminImagesQueryKey(), refetchInterval: 5000, refetchOnWindowFocus: true },
  });
  const { publish, hide, remove } = useAdminMutations();
  const { toast } = useToast();
  const [viewing, setViewing] = useState<ManagedImage | null>(null);
  const [deleting, setDeleting] = useState<ManagedImage | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const anyPending = pendingId !== null;

  const act = async (image: ManagedImage, action: 'publish' | 'hide' | 'delete') => {
    setPendingId(image.id);
    try {
      if (action === 'publish') { await publish.mutateAsync({ id: image.id }); toast({ title: 'Đã công khai', description: image.title }); }
      if (action === 'hide') { await hide.mutateAsync({ id: image.id }); toast({ title: 'Đã ẩn ảnh', description: image.title }); }
      if (action === 'delete') {
        await remove.mutateAsync({ id: image.id });
        toast({ title: 'Đã xoá ảnh', description: image.status === 'published' ? 'Trang công khai không còn ảnh nào.' : image.title });
        setDeleting(null);
        if (viewing?.id === image.id) setViewing(null);
      }
    } catch (cause) {
      toast({ title: 'Thao tác thất bại', description: errorMessage(cause), variant: 'destructive' });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section data-testid="section-library">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5a6466]">Thư viện</p>
          <h2 className="mt-1 text-lg font-semibold">Tất cả ảnh {data && <span className="font-mono text-sm text-[#5a6466]">({data.length})</span>}</h2>
        </div>
      </div>
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-64 animate-pulse rounded-xl bg-[#e9e3d6]" />)}</div>
      ) : isError ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-[#c8553d]/30 bg-[#f6e3de] p-5">
          <p className="flex items-center gap-2 font-medium text-[#7a2420]"><AlertTriangle className="size-4" />Không tải được thư viện ảnh</p>
          <p className="text-sm text-[#7a2420]/80">{errorMessage(error)}</p>
          <button onClick={() => refetch()} data-testid="button-retry-library" className="flex items-center gap-1.5 rounded-lg bg-[#1d2a2c] px-3 py-1.5 text-sm text-[#f4efe6]"><RefreshCw className="size-4" />Thử lại</button>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#1d2a2c]/20 px-6 py-12 text-center" data-testid="state-library-empty">
          <div className="grid size-14 place-items-center rounded-full bg-[#e9e3d6]"><ImagePlus className="size-6 text-[#5a6466]" /></div>
          <p className="font-medium">Thư viện đang trống</p>
          <p className="max-w-sm text-sm text-[#5a6466]">Ảnh bạn tải lên sẽ xuất hiện tại đây, kể cả bản nháp và ảnh đã ẩn.</p>
          <button onClick={onUpload} data-testid="button-empty-upload" className="rounded-lg bg-[#c8553d] px-4 py-2 text-sm font-medium text-[#fbf8f2]">Tải ảnh đầu tiên</button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((image) => {
            const pending = pendingId === image.id;
            return (
              <li key={image.id} data-testid={`card-image-${image.id}`} className={`group flex flex-col overflow-hidden rounded-xl border bg-[#fbf8f2] transition ${image.status === 'published' ? 'border-[#6f9e95] ring-2 ring-[#6f9e95]/30' : 'border-[#1d2a2c]/10'}`}>
                <button type="button" onClick={() => setViewing(image)} data-testid={`button-preview-${image.id}`} className="relative block aspect-[4/3] overflow-hidden bg-[#1d2a2c]">
                  <img src={image.url} alt={image.title} loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  <span className="absolute left-2 top-2"><StatusBadge status={image.status} id={image.id} /></span>
                </button>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <p className="line-clamp-2 font-medium leading-snug" data-testid={`text-image-title-${image.id}`}>{image.title}</p>
                  <p className="font-mono text-[11px] text-[#5a6466]">{formatBytes(image.size)} · {formatDate(image.createdAt)}</p>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                    {image.status !== 'published' ? (
                      <button onClick={() => void act(image, 'publish')} disabled={anyPending} data-testid={`button-publish-${image.id}`} className="flex items-center gap-1 rounded-md bg-[#1d2a2c] px-2.5 py-1.5 text-xs font-medium text-[#f4efe6] disabled:opacity-50">
                        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}Công khai
                      </button>
                    ) : (
                      <button onClick={() => void act(image, 'hide')} disabled={anyPending} data-testid={`button-hide-${image.id}`} className="flex items-center gap-1 rounded-md border border-[#1d2a2c]/20 px-2.5 py-1.5 text-xs font-medium disabled:opacity-50">
                        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <EyeOff className="size-3.5" />}Ẩn
                      </button>
                    )}
                    <button onClick={() => setViewing(image)} data-testid={`button-view-${image.id}`} className="flex items-center gap-1 rounded-md border border-[#1d2a2c]/20 px-2.5 py-1.5 text-xs"><Eye className="size-3.5" />Xem</button>
                    <button onClick={() => setDeleting(image)} disabled={anyPending} data-testid={`button-delete-${image.id}`} className="ml-auto flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-[#a3322a] hover:bg-[#f6e3de] disabled:opacity-50"><Trash2 className="size-3.5" />Xoá</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-3xl bg-[#fbf8f2]" data-testid="dialog-image-preview">
          {viewing && <>
            <div className="flex items-center gap-2"><StatusBadge status={viewing.status} id={`dlg-${viewing.id}`} /></div>
            <DialogTitle className="text-[#1d2a2c]">{viewing.title}</DialogTitle>
            <DialogDescription className="font-mono text-xs">{viewing.fileName} · {formatBytes(viewing.size)}</DialogDescription>
            <div className="overflow-hidden rounded-xl bg-[#1d2a2c]"><img src={viewing.url} alt={viewing.title} className="mx-auto max-h-[60dvh] w-full object-contain" /></div>
          </>}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && pendingId === null && setDeleting(null)}>
        <AlertDialogContent className="bg-[#fbf8f2]">
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá vĩnh viễn ảnh này?</AlertDialogTitle>
            <AlertDialogDescription>“{deleting?.title}” sẽ bị xoá khỏi thư viện và không thể khôi phục.{deleting?.status === 'published' && ' Đây là ảnh đang công khai — trang tra cứu sẽ không còn ảnh nào cho đến khi bạn công khai ảnh khác.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={anyPending} data-testid="button-cancel-delete">Huỷ</AlertDialogCancel>
            <AlertDialogAction disabled={anyPending} data-testid="button-confirm-delete" className="bg-[#a3322a] text-[#fbf8f2] hover:bg-[#8a2922]" onClick={(event) => { event.preventDefault(); if (deleting) void act(deleting, 'delete'); }}>
              {anyPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}Xoá ảnh
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
