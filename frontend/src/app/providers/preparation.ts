import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  loadPreparation,
  saveStored,
  storageKeys,
} from "@/app/shared/storage/storage";
import { generationReducer } from "@/app/features/preparation/state/generation";
import {
  generateLessons,
  preparationSnapshot,
  regenerateLessons,
} from "@/app/features/preparation/api";
import {
  generateSchema,
  regenerateSchema,
} from "@/app/features/preparation/schema";
import type { GenerationEvent, Language } from "@/app/shared/schemas/domain";
import { useSettings } from "./settings";
import { usePresets } from "./presets";
import { useAlerts } from "./alerts";
import { useI18n } from "./i18n";

export function usePreparationState() {
  const [{ value, warning }] = useState(loadPreparation);
  const [state, dispatch] = useReducer(generationReducer, {
    preparation: value,
    busy: false,
    stage: "",
    liveDraft: "",
    activeVariantId: "",
    error: "",
  });
  const [files, setFiles] = useState<File[]>([]),
    [className, setClassName] = useState(""),
    [duration, setDuration] = useState(45);
  const [sourceLanguage, setSourceLanguage] = useState<Language>("en"),
    [variantCount, setVariantCount] = useState(3),
    [sessionCount, setSessionCount] = useState(1),
    [materialNote, setMaterialNote] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const request = useRef<AbortController | null>(null),
    lastPersisted = useRef(value);
  const { settings } = useSettings(),
    { selectedPreset } = usePresets(),
    alerts = useAlerts(),
    t = useI18n();
  const { setError, setNotice } = alerts;
  const navigate = useNavigate();
  useEffect(() => {
    if (warning) setNotice(warning);
  }, [warning, setNotice]);
  useEffect(
    () => () => {
      request.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (lastPersisted.current === state.preparation) return;
    lastPersisted.current = state.preparation;
    const issue = saveStored(storageKeys.preparation, state.preparation);
    if (issue) setNotice(issue);
  }, [state.preparation, setNotice]);
  const latestRound = state.preparation?.variants.length
    ? Math.max(...state.preparation.variants.map((v) => v.generationRound))
    : 0;
  const currentVariants =
    state.preparation?.variants.filter(
      (v) => v.generationRound === latestRound,
    ) ?? [];
  const activeVariant =
    currentVariants.find((v) => v.id === state.activeVariantId) ??
    currentVariants[0];
  async function run(regenerate: boolean) {
    if (request.current) return;
    setError("");
    setNotice("");
    setFieldErrors({});
    const credentialToken = settings.keys[settings.provider],
      model = settings.models[settings.provider];
    if (!credentialToken || !model) {
      setError(t.providerNeeded);
      navigate("/settings");
      return;
    }
    if (regenerate && !state.preparation) return;
    const payload = regenerate
      ? {
          snapshot: preparationSnapshot(state.preparation!),
          variantCount,
          generationRound: latestRound + 1,
          provider: settings.provider,
          model,
          credentialToken,
        }
      : {
          files,
          className,
          totalDurationMinutes: duration,
          sourceLanguage,
          variantCount,
          sessionCount,
          materialNote,
          provider: settings.provider,
          model,
          credentialToken,
          preset: selectedPreset,
        };
    const controller = new AbortController();
    const deliver = (event: GenerationEvent) => {
      if (request.current === controller && !controller.signal.aborted)
        dispatch({ type: "event", value: event });
    };
    try {
      if (regenerate) {
        const result = regenerateSchema.safeParse(payload);
        if (!result.success) {
          setError(result.error.issues.map((issue) => issue.message).join(" "));
          return;
        }
        request.current = controller;
        dispatch({ type: "start", regenerate });
        navigate("/results");
        await regenerateLessons(result.data, deliver, controller.signal);
      } else {
        const result = generateSchema.safeParse(payload);
        if (!result.success) {
          const fields: Record<string, string> = {};
          for (const issue of result.error.issues) {
            const field = String(issue.path[0]);
            fields[field] =
              field === "files"
                ? t.invalidFiles
                : field === "className"
                  ? t.className
                  : field === "totalDurationMinutes"
                    ? issue.code === "custom"
                      ? t.mismatch
                      : t.invalidDuration
                    : field === "preset"
                      ? t.invalidFlow
                      : issue.message;
          }
          setFieldErrors(fields);
          setError(Object.values(fields).join(" "));
          const control = document.querySelector<HTMLElement>(
            `[name="${Object.keys(fields)[0]}"]`,
          );
          control?.focus();
          return;
        }
        request.current = controller;
        dispatch({ type: "start", regenerate });
        navigate("/results");
        await generateLessons(result.data, deliver, controller.signal);
      }
    } catch (cause) {
      if (request.current === controller && !controller.signal.aborted) {
        setError((cause as Error).message);
        dispatch({ type: "finish", error: (cause as Error).message });
      }
    } finally {
      if (request.current === controller) {
        request.current = null;
        dispatch({ type: "finish" });
      }
    }
  }
  function cancel() {
    request.current?.abort();
  }
  return {
    ...state,
    fieldErrors,
    files,
    setFiles,
    className,
    setClassName,
    duration,
    setDuration,
    sourceLanguage,
    setSourceLanguage,
    variantCount,
    setVariantCount,
    sessionCount,
    setSessionCount,
    materialNote,
    setMaterialNote,
    latestRound,
    currentVariants,
    activeVariant,
    setActiveVariantId: (id: string) => dispatch({ type: "select", id }),
    generate: () => run(false),
    regenerate: () => run(true),
    cancel,
  };
}
export const PreparationContext = createContext<ReturnType<
  typeof usePreparationState
> | null>(null);
export function usePreparation() {
  const value = useContext(PreparationContext);
  if (!value) throw new Error("PreparationProvider is required.");
  return value;
}
