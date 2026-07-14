import { notifications } from "@mantine/notifications";
import { useCallback, useState } from "react";

export function useRequest<T>(path: string, method: "POST" | "PUT" | "DELETE") {
  const url = `http://localhost:${import.meta.env.VITE_PUBLIC_PORT}${path}`;
  const [data, setData] = useState<T | null>(null);
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

        if (!response.ok) {
          const msg = response.statusText ?? "An unknown error occurred.";
          setError(msg);
          notifications.show({
            title: "Server Error",
            message: msg,
            color: "red",
          });
        }

        const result = await response.json();
        setData(result);
        return result;
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
    [url],
  );

  return { executeRequest, data, isLoading, error };
}
