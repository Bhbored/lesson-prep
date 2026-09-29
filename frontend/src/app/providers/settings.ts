import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  loadSettings,
  saveStored,
  storageKeys,
} from "@/app/shared/storage/storage";
import type { ProviderId, Settings } from "@/app/shared/schemas/domain";
import { useAlerts } from "./alerts";

export function useSettingsState() {
  const [{ value, warning }] = useState(loadSettings);
  const [settings, setSettings] = useState(value);
  const [revisions, setRevisions] = useState<Record<string, number>>({});
  const [keyInputs, setKeyInputs] = useState<
    Partial<Record<ProviderId, string>>
  >({});
  const epochs = useRef<Partial<Record<ProviderId, number>>>({});
  const current = useRef(settings);
  const client = useQueryClient();
  const { setNotice } = useAlerts();
  useEffect(() => {
    if (warning) setNotice(warning);
  }, [warning, setNotice]);
  const beginCredentialChange = useCallback(
    (provider: ProviderId) => {
      const epoch = (epochs.current[provider] ?? 0) + 1;
      epochs.current[provider] = epoch;
      void client.cancelQueries({ queryKey: ["models", provider] });
      client.removeQueries({ queryKey: ["models", provider] });
      setRevisions((old) => ({ ...old, [provider]: epoch }));
      return epoch;
    },
    [client],
  );
  const isCurrentCredentialChange = useCallback(
    (provider: ProviderId, epoch: number) => epochs.current[provider] === epoch,
    [],
  );
  const updateSettings = useCallback(
    (update: Settings | ((previous: Settings) => Settings)) => {
      const previous = current.current;
      const next = typeof update === "function" ? update(previous) : update;
      for (const provider of [
        "openAi",
        "gemini",
        "anthropic",
        "deepSeek",
      ] as const) {
        if (previous.keys[provider] !== next.keys[provider]) {
          beginCredentialChange(provider);
        }
      }
      current.current = next;
      setSettings(next);
      const issue = saveStored(storageKeys.settings, next);
      if (issue) setNotice(issue);
    },
    [beginCredentialChange, setNotice],
  );
  return {
    settings,
    updateSettings,
    revisions,
    keyInputs,
    setKeyInputs,
    beginCredentialChange,
    isCurrentCredentialChange,
  };
}
export const SettingsContext = createContext<ReturnType<
  typeof useSettingsState
> | null>(null);
export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("SettingsProvider is required.");
  return value;
}
