import { afterEach, expect, it, vi } from "vitest";
import {
  buildGameHtml,
  downloadGameHtml,
  shuffleChoiceItem,
} from "./buildGameHtml";
import { embedJson, escapeHtml } from "./htmlDocument";
import type { Game } from "@/app/shared/schemas/domain";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

const hunt: Game = {
  title: "Leaf <quest>",
  kind: "matching",
  hook: "Stamp the map.",
  host: "Navigator",
  presetId: "quest_atlas",
  band: "middle",
  adventure: { stages: [] },
  matching: {
    pairs: [
      { left: "Sun", right: "Energy" },
      { left: "Leaf", right: "Food" },
    ],
  },
  race: { rounds: [] },
};

it("embeds escaped game data in a designed document", () => {
  const html = buildGameHtml(hunt);
  expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
  expect(html).toContain("Leaf &lt;quest&gt;");
  expect(html).not.toContain("<quest>");
  expect(html).toContain("playMatching");
  expect(html).toContain("Literata");
  expect(html).toContain("compass");
  expect(html).toContain("ink-stamp");
  expect(html).toContain(
    embedJson({
      title: hunt.title,
      kind: "matching",
      hook: hunt.hook,
      host: hunt.host,
      band: "middle",
      stages: [],
      pairs: hunt.matching?.pairs,
      rounds: [],
      scoreLabel: "Score",
    }).slice(0, 24),
  );
  expect(escapeHtml(`<img src=x onerror=alert(1)>`)).not.toContain("<img");
});

it("uses a different animated shell per age band", () => {
  const early = buildGameHtml({
    ...hunt,
    band: "early",
    kind: "adventure",
    adventure: {
      stages: [
        {
          prompt: "Go",
          options: ["A", "B"],
          correctIndex: 0,
          success: "Y",
          miss: "N",
        },
      ],
    },
    matching: { pairs: [] },
  });
  const upper = buildGameHtml({
    ...hunt,
    band: "upper",
    kind: "race",
    race: {
      rounds: [
        { prompt: "Go", options: ["A", "B"], correctIndex: 0, explanation: "" },
      ],
    },
    matching: { pairs: [] },
  });
  expect(early).toContain("floaty");
  expect(early).toContain("confetti");
  expect(early).toContain("band-early");
  expect(upper).toContain("scan");
  expect(upper).toContain("glitch");
  expect(upper).toContain("band-upper");
});

it("shuffles choice order while keeping the correct answer", () => {
  const item = {
    prompt: "Need?",
    options: ["Sun", "Rock", "Mud"],
    correctIndex: 0,
    explanation: "",
  };
  let call = 0;
  const shuffled = shuffleChoiceItem(item, () => {
    call += 1;
    return call === 1 ? 0.9 : 0.1;
  });
  expect(shuffled.options).toEqual(expect.arrayContaining(["Sun", "Rock", "Mud"]));
  expect(shuffled.options[shuffled.correctIndex]).toBe("Sun");
  expect(shuffled.options[0]).not.toBe("Sun");
});

it("downloads a standalone html file named for the option and session", () => {
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});
  const createObjectURL = vi.fn((_blob: Blob) => "blob:game");
  const revokeObjectURL = vi.fn();
  vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
  downloadGameHtml(hunt, 2, 3);
  expect(click).toHaveBeenCalledOnce();
  expect(createObjectURL).toHaveBeenCalledOnce();
  expect(revokeObjectURL).toHaveBeenCalledWith("blob:game");
  const blob = createObjectURL.mock.calls[0][0];
  expect(blob).toBeInstanceOf(Blob);
  expect(blob.type).toContain("text/html");
});

it("uses the game_opt_session filename", () => {
  const names: string[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    names.push(this.download);
  });
  vi.stubGlobal("URL", {
    createObjectURL: () => "blob:game",
    revokeObjectURL: () => {},
  });
  downloadGameHtml(hunt, 1, 4);
  expect(names).toEqual(["game_opt1_session4.html"]);
});
