import { afterEach, expect, it, vi } from "vitest";
import { generateSessionTool } from "./api";
import { lesson, snapshot, token } from "@/test/fixtures";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const worksheet = {
  title: "Leaf worksheet",
  instructions: "Answer each item.",
  items: [
    {
      prompt: "What do plants need?",
      type: "short",
      options: [],
      answer: "Sunlight",
      explanation: "",
    },
  ],
};

it("posts a session tool request and validates the exercise response", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(JSON.stringify(worksheet), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetcher);
  const signal = new AbortController().signal;
  const result = await generateSessionTool(
    "worksheet",
    lesson,
    snapshot,
    "deepSeek",
    "model",
    token,
    signal,
  );
  expect(result).toEqual(worksheet);
  expect(fetcher.mock.calls[0][0]).toMatch(/LessonPreparations\/sessionTool$/);
  const options = fetcher.mock.calls[0][1]!;
  expect(options.method).toBe("POST");
  expect(options.signal).toBe(signal);
  expect(JSON.parse(String(options.body))).toEqual({
    snapshot,
    session: lesson,
    tool: "worksheet",
    provider: "deepSeek",
    model: "model",
    credentialToken: token,
  });
});

it("validates a game response", async () => {
  const game = {
    title: "Leaf hunt",
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
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(game), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
  await expect(
    generateSessionTool("game", lesson, snapshot, "deepSeek", "model", token),
  ).resolves.toMatchObject({ title: "Leaf hunt", kind: "matching" });
});
