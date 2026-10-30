import { useEffect, useState } from "react";
import { getImage } from "@/lib/imageStore";

/** Object URL of a map's stored image; `version` re-reads after a replace. */
export function useMapImage(mapId: string | undefined, version = 0): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!mapId) return;
    let alive = true;
    let created: string | null = null;
    getImage(mapId)
      .then((blob) => {
        if (!alive || !blob) return;
        created = URL.createObjectURL(blob);
        setUrl(created);
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (created) URL.revokeObjectURL(created);
      setUrl(null);
    };
  }, [mapId, version]);
  return url;
}
