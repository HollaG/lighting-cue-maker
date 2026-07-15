import { createContext, useContext, useState } from "react";
import { useFetch } from "../hooks/useFetch";
import type { ApiResponse } from "../types/server";
import type { GetEventRes } from "../types/http";
import type { Item, LightEventConfiguration } from "../types/types";

type AppContextType = {
  /** The UUID code of the currently active light event, or null if none. */
  code: string | null;
  setCode: (code: string | null) => void;

  event: LightEventConfiguration | null;
  isValidEvent: boolean;
  activeItem: Item | null;
  setActiveItem: (activeItem: Item | null) => void;
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [code, setCode] = useState<string>("");
  const [activeItem, setActiveItem] = useState<Item | null>(null);

  // Only fetch when we have a 36-char UUID. Guards against null crash.
  const isValidCode = code !== null && code.length === 36;
  const { data: fetchResp, loading, success } = useFetch<GetEventRes>(`/api/v1/events/${code}`, isValidCode);

  const isValidEvent = fetchResp !== null && success && isValidCode


  console.log({ fetchResp: fetchResp })
  return (
    <AppContext.Provider value={{ code, setCode, event: fetchResp?.event || null, isValidEvent, activeItem, setActiveItem }}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * Hook to consume the global app context.
 * Must be used inside <AppProvider>.
 */
export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside AppProvider");
  return ctx;
}
