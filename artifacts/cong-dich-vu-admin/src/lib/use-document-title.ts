import { useEffect } from 'react';

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const prior = document.title;
    document.title = `${title} · Bàn điều phối ảnh`;
    return () => { document.title = prior; };
  }, [title]);
}
