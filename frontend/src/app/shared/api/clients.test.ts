import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiClient } from "./ApiClient";
import { SseClient } from "./SseClient";
import { apiFailure, retryRead } from "./errors";
import { generationEventSchema } from "@/app/shared/schemas/domain";
import type { GenerationEvent } from "@/app/shared/schemas/domain";
import {
  generateLessons,
  preparationSnapshot,
  regenerateLessons,
} from "@/app/features/preparation/api";
import {
  completed,
  preset,
  snapshot,
  sse,
  streamResponse,
  variant,
} from "@/test/fixtures";

afterEach(() => vi.unstubAllGlobals());
describe("ApiClient", () => {
  it("supports an injected fetch, base URL, signal, and validated responses", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('{"id":1}'));
    const signal = new AbortController().signal;
    const client = new ApiClient("http://localhost/api/", fetcher);
    expect(
      await client.requestJson("/items", z.object({ id: z.number() }), {
        signal,
      }),
    ).toEqual({ id: 1 });
    expect(fetcher).toHaveBeenCalledWith("http://localhost/api/items", {
      signal,
    });
  });
  it("keeps backend codes and field validation errors and handles blank rate-limit responses", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: "validation_error",
            errors: { Model: ["Choose an AI model."] },
          }),
          { status: 400 },
        ),
      )
      .mockResolvedValueOnce(new Response("", { status: 429 }));
    const client = new ApiClient("/api", fetcher);
    await expect(
      client.requestJson("items", z.unknown()),
    ).rejects.toMatchObject({
      status: 400,
      code: "validation_error",
      message: "Choose an AI model.",
      fieldErrors: { Model: ["Choose an AI model."] },
    });
    await expect(client.requestJson("items", z.unknown())).rejects.toThrow(
      "Too many requests",
    );
  });
  it("rejects malformed JSON and responses violating their schemas", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("html"))
      .mockResolvedValueOnce(new Response('{"id":"wrong"}'));
    const client = new ApiClient("/api", fetcher);
    await expect(
      client.requestJson("items", z.object({ id: z.number() })),
    ).rejects.toMatchObject({ code: "invalid_response" });
    await expect(
      client.requestJson("items", z.object({ id: z.number() })),
    ).rejects.toMatchObject({ code: "invalid_response" });
  });
  it("allows one transient read retry without retrying invalid credentials, throttling, aborts, or invalid responses", () => {
    expect(retryRead(0, apiFailure("transient", 502))).toBe(true);
    expect(retryRead(1, apiFailure("transient", 502))).toBe(false);
    for (const status of [400, 401, 403, 429])
      expect(retryRead(0, apiFailure("failure", status))).toBe(false);
    expect(retryRead(0, new DOMException("cancelled", "AbortError"))).toBe(
      false,
    );
    expect(retryRead(0, apiFailure("invalid", 200, "invalid_response"))).toBe(
      false,
    );
  });
  it("constructs multipart requests with one flow selection and stateless regeneration JSON", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => streamResponse(completed));
    vi.stubGlobal("fetch", fetcher);
    const signal = new AbortController().signal;
    const request = {
      files: [new File(["material"], "lesson.pdf")],
      className: "Grade 7",
      totalDurationMinutes: 45,
      sourceLanguage: "en" as const,
      variantCount: 3,
      sessionCount: 2,
      provider: "deepSeek" as const,
      model: "model",
      credentialToken: "token",
      preset,
    };
    await generateLessons(request, () => {}, signal);
    const options = fetcher.mock.calls[0][1]!,
      form = options.body as FormData;
    expect(options.signal).toBe(signal);
    expect(form.get("files")).toMatchObject({ name: "lesson.pdf" });
    expect(form.get("totalDurationMinutes")).toBe("45");
    expect(form.get("sessionCount")).toBe("2");
    expect(form.get("credentialToken")).toBe("token");
    expect(form.get("lessonFlowPresetId")).toBe(preset.id);
    expect(form.has("customPhases")).toBe(false);
    await generateLessons(
      { ...request, preset: { ...preset, isDefault: false } },
      () => {},
      signal,
    );
    const custom = fetcher.mock.calls[1][1]!.body as FormData;
    expect(custom.has("lessonFlowPresetId")).toBe(false);
    expect(JSON.parse(String(custom.get("customPhases")))).toEqual(
      preset.phases,
    );
    await regenerateLessons(
      {
        snapshot: preparationSnapshot({ ...snapshot, variants: [variant] }),
        generationRound: 2,
        variantCount: 2,
        provider: "deepSeek",
        model: "model",
        credentialToken: "token",
      },
      () => {},
      signal,
    );
    const body = JSON.parse(String(fetcher.mock.calls[2][1]!.body));
    expect(body.snapshot).toEqual(snapshot);
    expect(body.snapshot).not.toHaveProperty("variants");
    expect(body.snapshot.preparedSourceText).toBe("");
  });
});
describe("SseClient", () => {
  it("finishes and cleans up on complete even when the connection remains open", async () => {
    const cancel = vi.fn();
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(completed));
        },
        cancel,
      }),
    );
    await new SseClient().consume(response, generationEventSchema, () => {});
    expect(cancel).toHaveBeenCalledOnce();
    expect(response.body!.locked).toBe(false);
  }, 1000);
  it("parses every known event with split CRLF boundaries and multilingual UTF-8", async () => {
    const events: GenerationEvent[] = [
      { event: "status", data: { stage: "extracting" } },
      { event: "preparation", data: snapshot },
      {
        event: "source_prepared",
        data: { preparedSourceText: "Résumé الشمس" },
      },
      { event: "text_delta", data: { number: 1, text: "Lumière الشمس" } },
      { event: "status", data: { stage: "retry", number: 1 } },
      {
        event: "session_ready",
        data: {
          variantId: variant.id,
          variantNumber: variant.variantNumber,
          generationRound: variant.generationRound,
          sessionNumber: 1,
          sessionCount: 1,
          provider: variant.provider,
          model: variant.model,
          lesson: variant.sessions[0],
        },
      },
      {
        event: "complete",
        data: { preparationId: snapshot.preparationId, round: 1 },
      },
    ];
    const response = streamResponse(
      events
        .map((value) => sse(value.event, value.data))
        .join("")
        .replaceAll("\n", "\r\n"),
      1,
    );
    const received: GenerationEvent[] = [];
    await new SseClient().consume(response, generationEventSchema, (event) =>
      received.push(event),
    );
    expect(received).toEqual(events);
    expect(response.body!.locked).toBe(false);
  });
  it("supports multiline data and ignores unknown events even if their data is not JSON", async () => {
    const response = streamResponse(
      'event: future\ndata: not-json\n\nevent: status\ndata: {\ndata: "stage":"generating"}\n\n' +
        completed,
    );
    const callback = vi.fn();
    await new SseClient().consume(response, generationEventSchema, callback);
    expect(callback).toHaveBeenCalledWith({
      event: "status",
      data: { stage: "generating" },
    });
    expect(callback).toHaveBeenCalledTimes(2);
  });
  it("rejects malformed known events, error events, and streams without completion", async () => {
    for (const [text, message] of [
      [sse("status", { stage: "unknown" }), "unexpected data"],
      [sse("error", {}), "unexpected data"],
      ["event: status\ndata:\n\n", "invalid JSON"],
      ["event: text_delta\ndata: broken\n\n", "invalid JSON"],
      [
        sse("error", {
          code: "document_error",
          message: "OCR could not read a scanned page.",
        }),
        "OCR could not read",
      ],
      [sse("status", { stage: "variant" }), "before generation completed"],
    ]) {
      const response = streamResponse(text);
      await expect(
        new SseClient().consume(response, generationEventSchema, () => {}),
      ).rejects.toThrow(message);
      expect(response.body!.locked).toBe(false);
    }
  });
  it("cancels pending reads and releases their reader", async () => {
    const cancel = vi.fn(),
      controller = new AbortController();
    const response = new Response(new ReadableStream({ cancel }));
    const pending = new SseClient().consume(
      response,
      generationEventSchema,
      () => {},
      controller.signal,
    );
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(cancel).toHaveBeenCalled();
    expect(response.body!.locked).toBe(false);
  });
});
