import { useEffect, useMemo, useState } from 'react';
import { Download, ImagePlus, Search, Trash2, UserRound, X } from 'lucide-react';
import { AdminShell } from '@/components/admin/admin-shell';
import { AdminGate } from '@/components/admin/admin-gate';
import { useDocumentTitle } from '@/lib/use-document-title';
import { readLocalProfiles, removeLocalProfile, updateLocalProfile, type LocalProfile } from '@/lib/local-profiles';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function ProfileWorkspace() {
  const [profiles, setProfiles] = useState<LocalProfile[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<LocalProfile | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reload = () => {
    const next = readLocalProfiles();
    setProfiles(next);
    setSelected((current) => current ? next.find((item) => item.id === current.id) ?? null : null);
  };

  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return profiles;
    return profiles.filter((profile) => {
      const id = profile.id.toLowerCase();
      const nationalId = profile.fields.nationalId ?? '';
      const name = profile.fields.name ?? '';
      return id.includes(normalized) || nationalId.includes(normalized) || name.toLowerCase().includes(normalized);
    });
  }, [profiles, query]);

  function handleImage(profile: LocalProfile, file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setMessage('Chỉ chấp nhận tệp hình ảnh.'); return; }
    if (file.size > MAX_IMAGE_SIZE) { setMessage('Ảnh không được vượt quá 5MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const updated: LocalProfile = {
        ...profile,
        attachment: { name: file.name, type: file.type, size: file.size, dataUrl: reader.result, uploadedAt: new Date().toISOString() },
      };
      updateLocalProfile(updated);
      setMessage('Đã cập nhật ảnh vào hồ sơ trên thiết bị này.');
      reload();
    };
    reader.readAsDataURL(file);
  }

  function deleteProfile(profile: LocalProfile) {
    if (!window.confirm(`Xóa hồ sơ ${profile.id} khỏi thiết bị này?`)) return;
    removeLocalProfile(profile.id);
    setMessage('Đã xóa hồ sơ cục bộ.');
    reload();
  }

  return (
    <AdminShell>
      <header className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5a6466]">Dữ liệu trên thiết bị</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">Hồ sơ cục bộ</h1>
        <p className="mt-2 max-w-3xl text-[#5a6466]">Quản lý hồ sơ và ảnh đính kèm đã lưu trên cùng trình duyệt này. Dữ liệu không được gửi lên máy chủ và Admin trên thiết bị khác sẽ không nhìn thấy danh sách này.</p>
      </header>

      <div className="mb-5 rounded-xl border border-[#d7c8b8] bg-[#fffaf4] p-4 text-sm text-[#6d4e3e]">
        <strong>Phạm vi lưu trữ:</strong> chỉ cục bộ trên thiết bị hiện tại. Ảnh tối đa 5MB, có thể tải về điện thoại từ hồ sơ.
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)]">
        <section className="rounded-xl border border-[#1d2a2c]/10 bg-[#fbf8f2] p-4 shadow-sm md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-lg font-semibold">Danh sách hồ sơ</h2><p className="text-sm text-[#5a6466]">{profiles.length} hồ sơ trên thiết bị</p></div>
            <button type="button" onClick={reload} className="rounded-lg border border-[#1d2a2c]/15 px-3 py-2 text-sm hover:bg-[#f1e8dc]">Làm mới</button>
          </div>
          <label className="mt-4 flex items-center gap-2 rounded-lg border border-[#1d2a2c]/15 bg-white px-3 py-2">
            <Search className="size-4 text-[#5a6466]" />
            <span className="sr-only">Tìm hồ sơ</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo số định danh, tên hoặc mã hồ sơ" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
          {filtered.length === 0 ? (
            <div className="mt-6 rounded-lg bg-[#f1e8dc] px-4 py-10 text-center text-sm text-[#5a6466]"><UserRound className="mx-auto mb-2 size-7" />Chưa có hồ sơ phù hợp.</div>
          ) : (
            <ul className="mt-4 space-y-2">
              {filtered.map((profile) => (
                <li key={profile.id}>
                  <button type="button" onClick={() => { setSelected(profile); setMessage(null); }} className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition ${selected?.id === profile.id ? 'border-[#c8553d] bg-[#f6e5dc]' : 'border-[#1d2a2c]/10 bg-white hover:bg-[#f8f0e8]'}`}>
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#1d2a2c] text-[#e8b04b]"><UserRound className="size-4" /></span>
                    <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{profile.fields.name || 'Chưa có tên'}</strong><span className="block truncate font-mono text-xs text-[#5a6466]">{profile.fields.nationalId || 'Chưa có số định danh'} · {profile.id}</span></span>
                    {profile.attachment && <ImagePlus className="size-4 shrink-0 text-[#6f9e95]" aria-label="Có ảnh đính kèm" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-[#1d2a2c]/10 bg-[#fbf8f2] p-4 shadow-sm md:p-5">
          {!selected ? <div className="flex min-h-64 flex-col items-center justify-center text-center text-[#5a6466]"><UserRound className="mb-3 size-9" /><p>Chọn một hồ sơ để xem chi tiết và quản lý ảnh.</p></div> : (
            <>
              <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-wider text-[#5a6466]">Chi tiết hồ sơ</p><h2 className="mt-1 text-xl font-semibold">{selected.fields.name || 'Hồ sơ chưa đặt tên'}</h2><p className="font-mono text-xs text-[#5a6466]">{selected.id}</p></div><button type="button" aria-label="Đóng chi tiết" onClick={() => setSelected(null)} className="rounded p-1 hover:bg-[#eee1d4]"><X className="size-5" /></button></div>
              <dl className="mt-5 grid gap-2 text-sm sm:grid-cols-2">{Object.entries(selected.fields).filter(([key]) => key !== 'coverage').map(([key, value]) => <div key={key} className="rounded bg-white px-3 py-2"><dt className="text-xs text-[#5a6466]">{key}</dt><dd className="font-medium break-words">{value}</dd></div>)}</dl>
              <div className="mt-5 border-t border-[#1d2a2c]/10 pt-4"><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">Ảnh đính kèm</h3><label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#c8553d] px-3 py-2 text-xs font-semibold text-white hover:bg-[#b2462f]"><ImagePlus className="size-4" />{selected.attachment ? 'Thay ảnh' : 'Thêm ảnh'}<input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => handleImage(selected, event.target.files?.[0])} /></label></div>
                {selected.attachment ? <><img src={selected.attachment.dataUrl} alt={`Ảnh đính kèm ${selected.attachment.name}`} className="mt-3 max-h-64 w-full rounded-lg bg-[#1d2a2c] object-contain" /><div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#5a6466]"><span className="break-all">{selected.attachment.name}</span><a href={selected.attachment.dataUrl} download={selected.attachment.name} className="inline-flex items-center gap-1.5 rounded-lg border border-[#1d2a2c]/15 px-3 py-2 font-semibold hover:bg-[#f1e8dc]"><Download className="size-3.5" />Tải về</a></div></> : <p className="mt-3 rounded-lg bg-[#f1e8dc] p-4 text-sm text-[#5a6466]">Chưa có ảnh. Bạn có thể chọn ảnh từ thiết bị hoặc chụp bằng camera trên điện thoại.</p>}
              </div>
              <button type="button" onClick={() => deleteProfile(selected)} className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-[#a3322a]/25 px-3 py-2 text-sm text-[#a3322a] hover:bg-[#f6e3de]"><Trash2 className="size-4" />Xóa hồ sơ trên thiết bị</button>
            </>
          )}
        </section>
      </div>
      {message && <p role="status" className="mt-4 rounded-lg bg-[#e4f0ed] px-4 py-3 text-sm text-[#245a53]">{message}</p>}
    </AdminShell>
  );
}

export default function AdminProfilesPage() {
  useDocumentTitle('Quản lý hồ sơ cục bộ');
  return <AdminGate><ProfileWorkspace /></AdminGate>;
}
