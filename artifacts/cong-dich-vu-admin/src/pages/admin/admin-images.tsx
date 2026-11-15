import { useRef } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';
import { AdminGate } from '@/components/admin/admin-gate';
import { CurrentPreview } from '@/components/admin/current-preview';
import { UploadPanel, type UploadPanelHandle } from '@/components/admin/upload-panel';
import { ImageLibrary } from '@/components/admin/image-library';
import { useLiveCurrentImage } from '@/hooks/use-live-current-image';
import { useDocumentTitle } from '@/lib/use-document-title';

function Workspace() {
  const uploader = useRef<UploadPanelHandle>(null);
  const { data } = useLiveCurrentImage();
  const openPicker = () => uploader.current?.openPicker();
  return (
    <AdminShell>
      <header className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5a6466]">Quản lý nội dung</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">Ảnh công khai</h1>
        <p className="mt-2 max-w-2xl text-[#5a6466]">Chỉ một ảnh được hiển thị trên trang tra cứu dùng chung. Công khai ảnh mới sẽ thay thế ảnh hiện tại cho mọi người xem.</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <CurrentPreview onReplace={openPicker} />
        <UploadPanel ref={uploader} hasCurrent={!!data?.image} />
      </div>
      <div className="mt-10"><ImageLibrary onUpload={openPicker} /></div>
    </AdminShell>
  );
}

export default function AdminImagesPage() {
  useDocumentTitle('Quản lý ảnh công khai');
  return <AdminGate><Workspace /></AdminGate>;
}
