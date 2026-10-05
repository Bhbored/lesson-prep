import { useRef, useState } from "react";
import { usePreparation } from "@/app/providers/preparation";
import { useSettings } from "@/app/providers/settings";
import { useAlerts } from "@/app/providers/alerts";
import { useI18n } from "@/app/providers/i18n";
import { generateSessionTool } from "../api";
import { downloadLessonPdf } from "../utils/downloadLessonPdf";
import { downloadGameHtml } from "../utils/buildGameHtml";
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
  const [loading, setLoading] = useState<SessionTool | "">("");
  const [tool, setTool] = useState<SessionTool | "">("");
  const [exercise, setExercise] = useState<ExerciseSet | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [failed, setFailed] = useState("");
  const [exporting, setExporting] = useState(false);
  const active = useRef(false);

  async function generate(next: SessionTool) {
    if (active.current) return;
    const credentialToken = settings.keys[settings.provider];
    const model = settings.models[settings.provider];
    if (!credentialToken || !model) {
      setError(t.providerNeeded);
      return;
    }
    if (!preparation) return;
    active.current = true;
    setLoading(next);
    setFailed("");
    try {
      const result = await generateSessionTool(
        next,
        lesson,
        preparationSnapshot(preparation),
        settings.provider,
        model,
        credentialToken,
      );
      if (next === "game") {
        setGame(result as Game);
        setExercise(null);
      } else {
        setExercise(result as ExerciseSet);
        setGame(null);
      }
      setTool(next);
    } catch {
      setFailed(t.toolFailed);
    } finally {
      active.current = false;
      setLoading("");
    }
  }

  async function exportExercise(element: HTMLElement) {
    if (!tool || tool === "game" || exporting) return;
    setExporting(true);
    try {
      await downloadLessonPdf(element, variantNumber, sessionNumber, tool);
    } catch {
      setError(t.pdfFailed);
    } finally {
      setExporting(false);
    }
  }

  function exportGame() {
    if (!game) return;
    downloadGameHtml(game, variantNumber, sessionNumber, t.score);
  }

  return {
    loading,
    tool,
    exercise,
    game,
    failed,
    exporting,
    generate,
    exportExercise,
    exportGame,
  };
}
