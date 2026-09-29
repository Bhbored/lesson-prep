// @vitest-environment node
import { readFile } from "node:fs/promises";
import { expect, it, vi } from "vitest";
import { getPresets } from "@/app/features/presets/api";
import { issueCredential, getModels } from "@/app/features/settings/api";
import {
  generateLessons,
  regenerateLessons,
} from "@/app/features/preparation/api";
import type { GenerationEvent } from "@/app/shared/schemas/domain";

it.skipIf(!process.env.API_TEST_URL)(
  "validates client utilities against the real API and scanned-PDF OCR without paid AI calls",
  async () => {
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", (url: string, options: RequestInit) =>
      originalFetch(new URL(url, process.env.API_TEST_URL), options),
    );
    try {
      const presets = await getPresets();
      expect(
        presets[0].phases.reduce(
          (total, phase) => total + phase.durationMinutes,
          0,
        ),
      ).toBe(45);
      const token = await issueCredential("deepSeek", "unused-test-key");
      expect(token).toMatch(/^[\w-]+\.\.[\w-]+\.[\w-]+\.[\w-]+$/);
      await expect(getModels("deepSeek", "invalid-token")).rejects.toThrow(
        "Unable to decrypt",
      );
      await expect(issueCredential("deepSeek", "")).rejects.toThrow(
        "ApiKey field is required",
      );
      const pdf = await readFile(
        new URL(
          "../../../../../backend/LessonPrep.Tests/Fixtures/mixed.pdf",
          import.meta.url,
        ),
      );
      for (const file of [
        new File(
          [
            "Photosynthesis uses sunlight and water to help plants grow in the classroom garden.",
          ],
          "plants.txt",
        ),
        new File([pdf], "mixed.pdf", { type: "application/pdf" }),
      ]) {
        const received: GenerationEvent[] = [];
        await expect(
          generateLessons(
            {
              files: [file],
              className: "Grade 7",
              totalDurationMinutes: 45,
              sourceLanguage: "en",
              variantCount: 1,
              provider: "deepSeek",
              model: "unused",
              credentialToken: "invalid-token",
              preset: presets[0],
            },
            (event) => received.push(event),
            new AbortController().signal,
          ),
        ).rejects.toThrow("Unable to decrypt");
        const snapshot = received.find(
          (event) => event.event === "preparation",
        )?.data;
        expect(snapshot).toBeDefined();
        if (!snapshot) throw new Error("No snapshot returned");
        expect(snapshot.preparedSourceText).toBe("");
        expect(snapshot.sourceText).toContain(
          file.name === "mixed.pdf"
            ? "Scanned lesson page about water"
            : "Photosynthesis",
        );
        await expect(
          regenerateLessons(
            {
              snapshot,
              generationRound: 2,
              variantCount: 1,
              provider: "deepSeek",
              model: "unused",
              credentialToken: "invalid-token",
            },
            () => {},
            new AbortController().signal,
          ),
        ).rejects.toThrow("Unable to decrypt");
      }
      if (process.env.CHECK_KEY_DECRYPT === "1") {
        await expect(
          getModels("deepSeek", token, AbortSignal.timeout(20_000)),
        ).rejects.toMatchObject({ status: 401 });
      }
    } finally {
      vi.unstubAllGlobals();
    }
  },
  120_000,
);
