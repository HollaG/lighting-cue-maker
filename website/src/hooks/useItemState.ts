import { useState } from "react";
import { useFetch } from "./useFetch";
import { useRequest } from "./useRequest";
import type { Item } from "../types/types";
import type { UpdateItemReq, UpdateItemRes } from "../types/http";

export function useItemState(eventId: string | undefined, isValidEvent: boolean) {
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [itemName, setItemName] = useState(""); // controlled input

  const { data: itemsData, refetch: refetchItems } = useFetch<{ items: Item[] }>(
    `/api/v1/events/${eventId}/items`,
    isValidEvent,
  );
  const items = itemsData?.items ?? [];

  const { executeRequest: executeCreateItem } = useRequest<{ name: string }, { item: Item }>(
    `/api/v1/events/${eventId}/items`,
    "POST",
  );

  const { executeRequest: executeUpdateItem } = useRequest<UpdateItemReq, UpdateItemRes>(
    `/api/v1/events/${eventId}/items/${activeItem?.id}`,
    "PATCH",
  );

  return {
    activeItem,
    setActiveItem,
    items,
    refetchItems,
    itemName,
    setItemName,
    executeCreateItem,
    executeUpdateItem,
  };
}
