import type {
  ExerciseSet,
  Game,
  SessionTool,
} from "@/app/shared/schemas/domain";
import { buildExerciseHtml } from "./buildExerciseHtml";
import { buildGameHtml } from "./buildGameHtml";
import { openHtmlPreview, saveHtmlFile } from "./htmlDocument";

interface ToolLabels {
  readonly worksheet: string;
  readonly quiz: string;
  readonly exercise: string;
  readonly question: string;
  readonly answerKey: string;
  readonly score: string;
  readonly name: string;
  readonly date: string;
}

export function buildSessionToolHtml(
  tool: SessionTool,
  payload: ExerciseSet | Game,
  labels: ToolLabels,
) {
  if (tool === "game") return buildGameHtml(payload as Game, labels.score);
  return buildExerciseHtml(
    payload as ExerciseSet,
    {
      kind: tool === "quiz" ? labels.quiz : labels.worksheet,
      exercise: labels.exercise,
      question: labels.question,
      answerKey: labels.answerKey,
      name: labels.name,
      date: labels.date,
      score: labels.score,
    },
    tool,
  );
}

export function previewSessionTool(
  tool: SessionTool,
  payload: ExerciseSet | Game,
  labels: ToolLabels,
) {
  openHtmlPreview(buildSessionToolHtml(tool, payload, labels));
}

export function saveSessionTool(
  tool: SessionTool,
  payload: ExerciseSet | Game,
  variantNumber: number,
  sessionNumber: number,
  labels: ToolLabels,
) {
  saveHtmlFile(
    buildSessionToolHtml(tool, payload, labels),
    `${tool}_opt${variantNumber}_session${sessionNumber}.html`,
  );
}
