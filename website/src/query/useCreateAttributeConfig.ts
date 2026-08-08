import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { CreateAttributeConfigReq, CreateAttributeConfigRes } from "../types/http";

export const useCreateAttributeConfig = () =>
  useMutation({
    mutationFn: (requestBody: CreateAttributeConfigReq) =>
      api.post<CreateAttributeConfigReq, CreateAttributeConfigRes>("/api/v1/attribute-config", requestBody),
  });
