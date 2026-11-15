import { useEffect, useState } from "react";
import { api } from "../api/client";
export function useData<T>(path: string | null, revision = 0) {
  const [state, set] = useState<{ data?: T; error?: string }>({});
  useEffect(() => {
    let active = true;
    set({});
    if (path)
      api<T>(path)
        .then((data) => active && set({ data }))
        .catch((err) => active && set({ error: err.message }));
    return () => {
      active = false;
    };
  }, [path, revision]);
  return state;
}
