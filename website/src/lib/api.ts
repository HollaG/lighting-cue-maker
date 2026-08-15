import { notifications } from "@mantine/notifications";
import type { ApiResponse } from "../types/server";

const BASE_URL = import.meta.env.VITE_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

async function request<T>(path: string, init?: RequestInit, suppressNotifications: boolean = false): Promise<T> {
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });

    if (!res.ok) {
      const result: ApiResponse<T> = await res.json();
      const msg = result.error ?? res.statusText ?? "An unknown server error occurred.";
      if (!suppressNotifications) {
        notifications.show({
          title: "Server Error",
          message: msg,
          color: "red",
        });
      }
      throw new Error(msg);
    }

    const body: ApiResponse<T> = await res.json();
    if (!body.success) {
      const msg = body.error ?? "An unknown error occurred.";
      if (!suppressNotifications) {
        notifications.show({
          title: "Server Error",
          message: msg,
          color: "red",
        });
      }
      throw new Error(msg);
    }

    return body.data as T;
  } catch (err: any) {
    if (err.message && err.message !== "Failed to fetch") {
      throw err;
    }
    const msg = err?.message ?? "Failed to fetch.";
    if (!suppressNotifications) {
      notifications.show({
        title: "Network Error",
        message: msg,
        color: "red",
      });
    }
    throw err;
  }
}

export const api = {
  get: <T>(path: string, suppressNotifications?: boolean) => request<T>(path, { method: "GET" }, suppressNotifications),
  post: <T, U>(path: string, data?: T) =>
    request<U>(path, {
      method: "POST",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  put: <T, U>(path: string, data?: T) =>
    request<U>(path, {
      method: "PUT",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  patch: <T, U>(path: string, data?: T) =>
    request<U>(path, {
      method: "PATCH",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  delete: <T, U>(path: string, data?: T) =>
    request<U>(path, { method: "DELETE", body: data !== undefined ? JSON.stringify(data) : undefined }),
};
