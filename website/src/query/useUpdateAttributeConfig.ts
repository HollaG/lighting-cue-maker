import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAppStore } from "../store/appStore";
import type { UpdateAttributeConfigReq } from "../types/http";

type UpdateAttributeConfigRes = {
  attribute: import("../types/types").AttributeConfiguration;
};

export const useUpdateAttributeConfig = () => {
  const code = useAppStore((s) => s.code);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      attributeId,
      requestBody,
    }: {
      attributeId: string;
      requestBody: UpdateAttributeConfigReq;
    }) =>
      api.patch<UpdateAttributeConfigReq, UpdateAttributeConfigRes>(
        `/api/v1/attribute-config/${attributeId}`,
        requestBody,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", code] });
    },
  });
};
