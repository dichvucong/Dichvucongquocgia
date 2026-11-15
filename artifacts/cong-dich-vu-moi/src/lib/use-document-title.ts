import { useEffect } from "react";
export const BASE_TITLE = "Cổng thông tin dịch vụ";
export function useDocumentTitle(title?: string) {
  useEffect(() => { document.title = title ? `${title} | ${BASE_TITLE}` : BASE_TITLE; }, [title]);
}
