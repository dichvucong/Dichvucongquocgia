import type { ManagedImageStatus } from '@workspace/api-client-react';

const statusMap: Record<ManagedImageStatus, { label: string; className: string }> = {
  draft: { label: 'Bản nháp', className: 'bg-[#e9e3d6] text-[#5a4a2a] ring-[#c9b98f]' },
  published: { label: 'Đang công khai', className: 'bg-[#dcebe7] text-[#22564d] ring-[#6f9e95]' },
  hidden: { label: 'Đã ẩn', className: 'bg-[#ece7e5] text-[#5a5250] ring-[#b8aca8]' },
};

export function StatusBadge({ status, id }: { status: ManagedImageStatus; id: string }) {
  const item = statusMap[status];
  return (
    <span data-testid={`status-image-${id}`} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ring-1 ${item.className}`}>
      {status === 'published' && <span className="size-1.5 rounded-full bg-[#2f7a6c]" />}
      {item.label}
    </span>
  );
}
