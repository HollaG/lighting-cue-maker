import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { CreateItemReq, CreateItemRes } from "../types/http";
import { useAppStore } from "../store/appStore";

export const useCreateItem = () => {
  const queryClient = useQueryClient();
  const changeActiveItem = useAppStore((s) => s.setActiveItemId);
  const setItemName = useAppStore((s) => s.setItemName);

  return useMutation({
    mutationFn: (item: CreateItemReq) => api.post<CreateItemReq, CreateItemRes>("/api/v1/items", item),

    onSuccess: (res) => {
      if (res.item) {
        // refetch GetItems
        queryClient.invalidateQueries({ queryKey: ["items"] }).then(() => {
          // change to this item being the active item
          // note that this forces an invalidation of GetItem

          setTimeout(() => changeActiveItem(res.item.id), 10);

          setItemName("");
        }); // queryKey = ["items", eventId] but partial match works
      }
    },
  });
};
