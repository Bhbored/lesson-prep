import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useSettings } from "@/app/providers/settings";
import { useAlerts } from "@/app/providers/alerts";
import { useI18n } from "@/app/providers/i18n";
import { logos } from "@/app/shared/data/workspace";
import { providerIds, providerNames } from "@/app/shared/data/providers";
import { issueCredential } from "../api";
import { useModelsQuery } from "../queries";

export function useSettingsPage() {
  const state = useSettings(),
    alerts = useAlerts(),
    t = useI18n();
  const { settings, updateSettings } = state;
  const { setError, setNotice } = alerts;
  const query = useModelsQuery();
  const provider = settings.provider,
    chosen = settings.models[provider];
  useEffect(() => {
    if (query.error) setError(query.error.message);
  }, [query.error, setError]);
  useEffect(() => {
    if (
      chosen &&
      query.data &&
      !query.data.some((model) => model.id === chosen)
    ) {
      updateSettings((previous) => ({
        ...previous,
        models: { ...previous.models, [provider]: "" },
      }));
      setNotice(t.unavailableModel);
    }
  }, [
    chosen,
    provider,
    query.data,
    updateSettings,
    setNotice,
    t.unavailableModel,
  ]);
  const mutation = useMutation({
    mutationFn: ({
      provider,
      key,
    }: {
      provider: typeof settings.provider;
      key: string;
    }) => issueCredential(provider, key),
    retry: false,
  });
  const keyInput = state.keyInputs[provider] ?? "";
  function setKeyInput(value: string) {
    state.setKeyInputs((previous) => ({ ...previous, [provider]: value }));
  }
  async function saveKey() {
    if (!keyInput.trim() || mutation.isPending) return;
    setError("");
    setNotice("");
    const epoch = state.beginCredentialChange(provider);
    try {
      const token = await mutation.mutateAsync({
        provider,
        key: keyInput.trim(),
      });
      if (!state.isCurrentCredentialChange(provider, epoch)) return;
      setNotice(t.keySaved);
      updateSettings((previous) => ({
        ...previous,
        keys: { ...previous.keys, [provider]: token },
        models: { ...previous.models, [provider]: "" },
      }));
      state.setKeyInputs((previous) =>
        previous[provider] === keyInput
          ? { ...previous, [provider]: "" }
          : previous,
      );
    } catch (cause) {
      if (state.isCurrentCredentialChange(provider, epoch))
        setError((cause as Error).message);
    }
  }
  function removeKey() {
    state.beginCredentialChange(provider);
    updateSettings((previous) => {
      const keys = { ...previous.keys },
        models = { ...previous.models };
      delete keys[provider];
      delete models[provider];
      return { ...previous, keys, models };
    });
  }
  return {
    settings,
    updateSettings,
    ...alerts,
    t,
    keyInput,
    setKeyInput,
    saveKey,
    removeKey,
    models: query.data ?? [],
    modelLoading: query.isFetching,
    keySaving: mutation.isPending,
    refreshModels: () => {
      if (settings.keys[provider]) void query.refetch();
    },
    logos,
    providerIds,
    providerNames,
  };
}
