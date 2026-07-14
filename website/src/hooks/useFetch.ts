import { useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
import type { ApiResponse } from "../types/server";

export function useFetch<T>(path: string) {
  const url = `http://localhost:${import.meta.env.VITE_PUBLIC_PORT}${path}`;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(url)
      .then((r) => r.json() as Promise<ApiResponse<T>>)
      .then((res) => {
        if (!res.success) {
          const msg = res.error ?? "An unknown error occurred.";
          setError(msg);
          notifications.show({
            title: "Server Error",
            message: msg,
            color: "red",
          });
        } else {
          setData(res.data ?? null);
        }
      })
      .catch((err: Error) => {
        const msg = err.message ?? "Failed to fetch.";
        setError(msg);
        notifications.show({
          title: "Network Error",
          message: msg,
          color: "red",
        });
      })
      .finally(() => setLoading(false));
  }, [url]);

  return { data, loading, error };
}
