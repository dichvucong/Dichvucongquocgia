import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetCurrentImageQueryKey, useGetCurrentImage } from '@workspace/api-client-react';

export function useLiveCurrentImage() {
  const qc = useQueryClient();
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    const source = new EventSource('/api/content/events', { withCredentials: true });
    const refresh = () => { void qc.invalidateQueries({ queryKey: getGetCurrentImageQueryKey() }); };
    source.onopen = () => { setLive(true); refresh(); };
    source.onmessage = refresh;
    ['publication-change', 'publication', 'change', 'content', 'published', 'update'].forEach((name) => source.addEventListener(name, refresh));
    source.onerror = () => setLive(false);
    return () => source.close();
  }, [qc]);
  const query = useGetCurrentImage({
    query: {
      queryKey: getGetCurrentImageQueryKey(),
      refetchInterval: 2000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  });
  return { ...query, live };
}
