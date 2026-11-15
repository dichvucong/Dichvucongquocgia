import { User, HandHeart, Receipt, Map } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { DataCategoryTile, type DataCategory } from "@/components/tim-du-lieu/data-category-tile";
import { useDocumentTitle } from "@/lib/use-document-title";

const CATEGORIES: DataCategory[] = [
  { id: "ca-nhan", name: "Dữ liệu cá nhân", desc: "Nhóm thông tin về cá nhân", icon: User },
  { id: "bhxh", name: "Dữ liệu bảo hiểm xã hội", desc: "Nhóm thông tin về bảo hiểm xã hội", icon: HandHeart },
  { id: "to-khai-thue", name: "Dữ liệu tờ khai thuế", desc: "Nhóm thông tin về tờ khai thuế", icon: Receipt },
  { id: "dat-dai", name: "Dữ liệu đất đai", desc: "Nhóm thông tin về đất đai", icon: Map },
];

export default function TimDuLieuPage() {
  useDocumentTitle("Tìm dữ liệu");
  return (
    <PageShell title="Tìm dữ liệu" subtitle="Chọn nhóm dữ liệu bạn muốn tìm hiểu.">
      <div className="grid gap-4 md:grid-cols-2">{CATEGORIES.map((c) => <DataCategoryTile key={c.id} c={c} />)}</div>
    </PageShell>
  );
}
