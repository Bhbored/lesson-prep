import { afterEach, expect, it, vi } from "vitest";
import { buildGameHtml, downloadGameHtml, embedJson, escapeHtml } from "./buildGameHtml";
import type { Game } from "@/app/shared/schemas/domain";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

const quiz: Game = {
  title: "Leaf <quiz>",
  kind: "quiz",
  quiz: {
    questions: [
      {
        prompt: "What do plants need?",
        options: ["Rocks", "Sunlight"],
        correctIndex: 1,
        explanation: "They use sunlight.",
      },
    ],
  },
  matching: { pairs: [] },
};

it("embeds escaped game data in an app-owned document", () => {
  const html = buildGameHtml(quiz);
  expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
  expect(html).toContain("Leaf &lt;quiz&gt;");
  expect(html).not.toContain("<quiz>");
  expect(html).toContain(embedJson({
    title: quiz.title,
    kind: "quiz",
    questions: quiz.quiz?.questions,
    pairs: [],
    scoreLabel: "Score",
  }).slice(0, 20));
  expect(html).toContain("playQuiz");
  expect(escapeHtml(`<img src=x onerror=alert(1)>`)).not.toContain("<img");
});

it("downloads a standalone html file named for the option and session", () => {
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  const createObjectURL = vi.fn((_blob: Blob) => "blob:game");
  const revokeObjectURL = vi.fn();
  vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
  downloadGameHtml(quiz, 2, 3);
  const link = document.querySelector("a");
  expect(click).toHaveBeenCalledOnce();
  expect(createObjectURL).toHaveBeenCalledOnce();
  expect(revokeObjectURL).toHaveBeenCalledWith("blob:game");
  expect(link).toBeNull();
  const blob = createObjectURL.mock.calls[0][0];
  expect(blob).toBeInstanceOf(Blob);
  expect(blob.type).toContain("text/html");
});

it("uses the game_opt_session filename", () => {
  const names: string[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    names.push(this.download);
  });
  vi.stubGlobal("URL", {
    createObjectURL: () => "blob:game",
    revokeObjectURL: () => {},
  });
  downloadGameHtml(quiz, 1, 4);
  expect(names).toEqual(["game_opt1_session4.html"]);
});
