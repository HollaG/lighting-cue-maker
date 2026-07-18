import { useLocalStorage } from "@mantine/hooks";
import { useFetch } from "./useFetch";
import type { GetEventRes } from "../types/http";
import type { LightEventConfiguration } from "../types/types";

export function useEventState() {
  const [code, setCode] = useLocalStorage<string>({ key: "code", defaultValue: "" });

  // Only fetch when we have a 36-char UUID. Guards against null crash.
  const isValidCode = code !== null && code.length === 36;
  const { data: fetchResp, success } = useFetch<GetEventRes>(`/api/v1/events/${code}`, isValidCode);

  const isValidEvent = fetchResp !== null && success && isValidCode;

  return {
    code,
    setCode,
    event: (fetchResp?.event ?? null) as LightEventConfiguration | null,
    isValidCode,
    isValidEvent,
  };
}
