import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCurrentImageQueryKey, useGetCurrentImage } from "@workspace/api-client-react";

/** Current published image, kept live via SSE + 2s polling + focus/reconnect refetch. */
export function useLiveCurrentImage() {
  const qc = useQueryClient();
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const es = new EventSource("/api/content/events", { withCredentials: true });
    const refresh = () => { void qc.invalidateQueries({ queryKey: getGetCurrentImageQueryKey() }); };
    es.onopen = () => { setLive(true); refresh(); };
    es.onmessage = refresh;
    ["publication-change", "publication", "change", "content", "published", "update"].forEach((n) => es.addEventListener(n, refresh));
    es.onerror = () => setLive(false);
    return () => { es.close(); };
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
