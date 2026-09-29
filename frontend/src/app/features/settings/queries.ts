import { useQuery } from "@tanstack/react-query";
import { getModels } from "./api";
import { useSettings } from "@/app/providers/settings";

export function useModelsQuery() {
  const { settings, revisions } = useSettings();
  const provider = settings.provider,
    credential = settings.keys[provider];
  return useQuery({
    queryKey: ["models", provider, revisions[provider] ?? 0],
    queryFn: ({ signal }) => getModels(provider, credential!, signal),
    enabled: Boolean(credential),
    staleTime: 5 * 60_000,
  });
}
