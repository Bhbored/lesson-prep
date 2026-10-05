import { useCallback, useRef, useState } from "react";
import { usePreparation } from "@/app/providers/preparation";
import { useSettings } from "@/app/providers/settings";
import { useAlerts } from "@/app/providers/alerts";
import { useI18n } from "@/app/providers/i18n";
import { generateSessionTool } from "../api";
import { previewSessionTool, saveSessionTool } from "../utils/sessionToolDocument";
import { preparationSnapshot } from "@/app/features/preparation/api";
import type {
  ExerciseSet,
  Game,
  Lesson,
  SessionTool,
} from "@/app/shared/schemas/domain";

export function useSessionTools(
  lesson: Lesson,
  variantNumber: number,
  sessionNumber: number,
) {
  const { preparation } = usePreparation();
  const { settings } = useSettings();
  const { setError } = useAlerts();
  const t = useI18n();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<SessionTool | "">("");
  const [tool, setTool] = useState<SessionTool | "">("");
  const [exercise, setExercise] = useState<ExerciseSet | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [failed, setFailed] = useState("");
  const active = useRef(false);
  const abort = useRef<AbortController | null>(null);

  const close = useCallback(() => {
    abort.current?.abort();
    abort.current = null;
    active.current = false;
    setLoading("");
    setOpen(false);
  }, []);

  const generate = useCallback(
    async (next: SessionTool) => {
      if (open && tool === next && (next === "game" ? game : exercise) && !loading && !failed) {
        setOpen(true);
        return;
      }
      const credentialToken = settings.keys[settings.provider];
      const model = settings.models[settings.provider];
      if (!credentialToken || !model) {
        setError(t.providerNeeded);
        return;
      }
      if (!preparation || active.current) return;
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      active.current = true;
      setOpen(true);
      setLoading(next);
      setTool(next);
      setFailed("");
      setExercise(null);
      setGame(null);
      try {
        const result = await generateSessionTool(
          next,
          lesson,
          preparationSnapshot(preparation),
          settings.provider,
          model,
          credentialToken,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        if (next === "game") setGame(result as Game);
        else setExercise(result as ExerciseSet);
      } catch {
        if (controller.signal.aborted) return;
        setFailed(t.toolFailed);
      } finally {
        if (abort.current === controller) {
          active.current = false;
          setLoading("");
        }
      }
    },
    [
      exercise,
      failed,
      game,
      lesson,
      loading,
      open,
      preparation,
      setError,
      settings,
      t,
      tool,
    ],
  );

  const preview = useCallback(() => {
    const labels = {
      worksheet: t.worksheet,
      quiz: t.quiz,
      exercise: t.exercise,
      question: t.question,
      answerKey: t.answerKey,
      score: t.score,
      name: t.studentName,
      date: t.dateLabel,
    };
    if (tool === "game" && game) previewSessionTool(tool, game, labels);
    if (tool !== "game" && tool && exercise)
      previewSessionTool(tool, exercise, labels);
  }, [exercise, game, t, tool]);

  const save = useCallback(() => {
    const labels = {
      worksheet: t.worksheet,
      quiz: t.quiz,
      exercise: t.exercise,
      question: t.question,
      answerKey: t.answerKey,
      score: t.score,
      name: t.studentName,
      date: t.dateLabel,
    };
    if (tool === "game" && game)
      saveSessionTool(tool, game, variantNumber, sessionNumber, labels);
    if (tool !== "game" && tool && exercise)
      saveSessionTool(tool, exercise, variantNumber, sessionNumber, labels);
  }, [exercise, game, sessionNumber, t, tool, variantNumber]);

  const retry = useCallback(() => {
    if (tool) void generate(tool);
  }, [generate, tool]);

  return {
    open,
    loading,
    tool,
    exercise,
    game,
    failed,
    generate,
    preview,
    save,
    close,
    retry,
  };
}
