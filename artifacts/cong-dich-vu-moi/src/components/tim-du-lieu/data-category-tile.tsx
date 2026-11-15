import type { ComponentType } from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { ROUTES } from "@/lib/routes";

export type DataCategory = { id: string; name: string; desc: string; icon: ComponentType<{ className?: string; strokeWidth?: number }> };

export function DataCategoryTile({ c }: { c: DataCategory }) {
  const Icon = c.icon;
  return (
    <Link href={ROUTES.dataLookup} data-testid={`link-data-${c.id}`}
      className="group flex items-center gap-4 rounded-lg bg-[#f2f2f2] px-5 py-5 transition-all hover:-translate-y-0.5 hover:bg-[#efe3dc] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c87f5f]">
      <Icon className="size-8 shrink-0 text-[#c87f5f]" strokeWidth={1.4} />
      <span className="flex-1"><span className="block text-[17px] font-medium">{c.name}</span><span className="block text-sm text-[#7a6d68]">{c.desc}</span></span>
      <ChevronRight className="size-5 text-[#b9aaa3] transition group-hover:translate-x-0.5" />
    </Link>
  );
}
