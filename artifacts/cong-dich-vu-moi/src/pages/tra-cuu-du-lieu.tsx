import { DemoLookup } from "@/components/lookup/demo-lookup";
import { PageShell } from "@/components/page-shell";
import { ROUTES } from "@/lib/routes";
import { useDocumentTitle } from "@/lib/use-document-title";

export default function TraCuuDuLieuPage() {
  useDocumentTitle("Tra cứu dữ liệu");
  return (
    <PageShell title="Tra cứu dữ liệu" back={{ href: ROUTES.dataCategories, label: "Tìm dữ liệu" }} showFooterNotice={false}>
      <DemoLookup />
    </PageShell>
  );
}
