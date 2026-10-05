import { afterEach, expect, it, vi } from "vitest";
import { buildExerciseHtml } from "./buildExerciseHtml";
import { previewSessionTool, saveSessionTool } from "./sessionToolDocument";
import type { ExerciseSet } from "@/app/shared/schemas/domain";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const set: ExerciseSet = {
  title: "Leaf <sheet>",
  instructions: "Work quietly.",
  items: [
    {
      prompt: "What do plants need?",
      type: "short",
      options: [],
      answer: "Sunlight",
      explanation: "Light.",
    },
    {
      prompt: "Plants make food.",
      type: "multiple_choice",
      options: ["Yes", "No", "Maybe", "Never"],
      answer: "Yes",
      explanation: "",
    },
  ],
};

const labels = {
  kind: "Worksheet",
  exercise: "Exercise",
  question: "Question",
  answerKey: "Answer key",
  name: "Name",
  date: "Date",
  score: "Score",
};

it("builds a practice notebook worksheet with writing lines", () => {
  const html = buildExerciseHtml(set, labels, "worksheet");
  expect(html).toContain("Leaf &lt;sheet&gt;");
  expect(html).toContain("Answer key");
  expect(html).toContain("Sunlight");
  expect(html).toContain("class=\"write\"");
  expect(html).toContain("Exercise");
  expect(html).not.toContain("<sheet>");
  expect(html).not.toContain("scorebox");
});

it("builds a compact exit-ticket quiz with bubbles and a score box", () => {
  const html = buildExerciseHtml(
    { ...set, title: "Leaf check" },
    { ...labels, kind: "Quiz" },
    "quiz",
  );
  expect(html).toContain("scorebox");
  expect(html).toContain("Question");
  expect(html).toContain("class=\"bubble\"");
  expect(html).toContain("___ / 2");
  expect(html).not.toContain("class=\"write\"");
});

it("opens a preview tab and saves the same document", () => {
  const open = vi.spyOn(window, "open").mockImplementation(() => null);
  const names: string[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    names.push(this.download);
  });
  vi.stubGlobal("URL", {
    createObjectURL: () => "blob:tool",
    revokeObjectURL: () => {},
  });
  const toolLabels = {
    worksheet: "Worksheet",
    quiz: "Quiz",
    exercise: "Exercise",
    question: "Question",
    answerKey: "Answer key",
    score: "Score",
    name: "Name",
    date: "Date",
  };
  previewSessionTool("worksheet", set, toolLabels);
  expect(open).toHaveBeenCalledWith("blob:tool", "_blank", "noopener");
  saveSessionTool("worksheet", set, 2, 1, toolLabels);
  expect(names).toEqual(["worksheet_opt2_session1.html"]);
});
