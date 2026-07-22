import { notifications } from "@mantine/notifications";
import type { ApiResponse } from "../types/server";

const BASE_URL = import.meta.env.VITE_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });

    if (!res.ok) {
      const result: ApiResponse<T> = await res.json();
      const msg = result.error ?? res.statusText ?? "An unknown server error occurred.";
      notifications.show({
        title: "Server Error",
        message: msg,
        color: "red",
      });
      throw new Error(msg);
    }

    const body: ApiResponse<T> = await res.json();
    if (!body.success) {
      const msg = body.error ?? "An unknown error occurred.";
      notifications.show({
        title: "Server Error",
        message: msg,
        color: "red",
      });
      throw new Error(msg);
    }

    return body.data as T;
  } catch (err: any) {
    if (err.message && err.message !== "Failed to fetch") {
      throw err;
    }
    const msg = err?.message ?? "Failed to fetch.";
    notifications.show({
      title: "Network Error",
      message: msg,
      color: "red",
    });
    throw err;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
