import { notifications } from "@mantine/notifications";
import { useCallback, useState } from "react";
import type { ApiResponse } from "../types/server";

export function useRequest<T, U>(path: string, method: "POST" | "PUT" | "DELETE" | "PATCH") {
  const baseUrl = import.meta.env.VITE_PUBLIC_BACKEND_URL ?? "http://localhost:8080";
  const url = `${baseUrl}${path}`;
  const [data, setData] = useState<U | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wrap the execution logic in useCallback to prevent unnecessary re-renders
  const executeRequest = useCallback(
    async (bodyData: T) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyData),
        });

        const result: ApiResponse<U> = await response.json();
        if (!response.ok) {
          const msg = result.error ?? response.statusText ?? "An unknown error occurred.";
          setError(msg);
          notifications.show({
            title: "Server Error",
            message: msg,
            color: "red",
          });
          return;
        }

        setData(result.data ?? null);
        return result.data;
      } catch (err) {
        const msg = (err as Error).message ?? "Failed to fetch.";
        setError(msg);
        notifications.show({
          title: "Network Error",
          message: msg,
          color: "red",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [url, method],
  );

  return { executeRequest, data, isLoading, error };
}
