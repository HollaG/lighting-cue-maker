import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { FixtureTemplate } from "../../types-v2/fixtureTemplates";

/** The list leaves out `rawSource` (the original import file) to keep the response small. */
export type FixtureTemplateSummary = Omit<FixtureTemplate, "rawSource">;

export type GetFixtureTemplatesRes = {
  fixtureTemplates: FixtureTemplateSummary[];
};

export const makeGetFixtureTemplatesQueryKey = () => ["v2", "fixtureTemplates"] as const;

/** The global fixture library, sorted by manufacturer then name. */
export const useGetFixtureTemplates = () => {
  const query = useQuery({
    queryKey: makeGetFixtureTemplatesQueryKey(),
    queryFn: async () => {
      const res = await api.get<GetFixtureTemplatesRes>("/api/v2/fixture-templates");
      return res.fixtureTemplates;
    },
  });

  return {
    fixtureTemplates: query.data ?? [],
    refetchFixtureTemplates: query.refetch,
    isFixtureTemplatesLoading: query.isLoading,
    isFixtureTemplatesError: query.isError,
    fixtureTemplatesError: query.error,
  };
};
