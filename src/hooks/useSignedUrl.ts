import * as React from "react";
import { supabase } from "../lib/supabase";

function splitBucketObject(path?: string | null) {
  if (!path) return { bucket: null, object: null };
  const idx = path.indexOf("/");
  if (idx <= 0) return { bucket: null, object: null };
  return { bucket: path.slice(0, idx), object: path.slice(idx + 1) };
}

async function getSignedUrl(path?: string | null, ttlSec = 3600): Promise<string | null> {
  if (!path) return null;
  const { bucket, object } = splitBucketObject(path);
  if (!bucket || !object) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(object, ttlSec);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export function useSignedUrl(path?: string | null, ttlSec = 3600) {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    let cancel = false;
    (async () => {
      if (!path) {
        setUrl(null);
        return;
      }
      const u = await getSignedUrl(path, ttlSec);
      if (!cancel) setUrl(u);
    })();
    return () => {
      cancel = true;
    };
  }, [path, ttlSec]);
  return url;
}
