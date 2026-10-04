import type { z } from "zod";
import {
  apiFailure,
  failureFromPayload,
  responseFailure,
  streamErrorSchema,
} from "./errors";

export class SseClient {
  async consume<T>(
    response: Response,
    schema: z.ZodType<T>,
    onEvent: (event: T) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    if (!response.ok) throw await responseFailure(response);
    if (!response.body)
      throw apiFailure("Streaming is unavailable in this browser.");
    const reader = response.body.getReader();
    const abort = () => {
      void reader.cancel().catch(() => {});
    };
    signal?.addEventListener("abort", abort, { once: true });
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        signal?.throwIfAborted();
        const { value, done } = await reader.read();
        signal?.throwIfAborted();
        buffer += decoder.decode(value, { stream: !done });
        let delimiter = /\r?\n\r?\n/.exec(buffer);
        while (delimiter) {
          const block = buffer.slice(0, delimiter.index);
          buffer = buffer.slice(delimiter.index + delimiter[0].length);
          const lines = block.split(/\r?\n/);
          const event =
            lines
              .find((line) => line.startsWith("event:"))
              ?.slice(6)
              .trim() ?? "message";
          const text = lines
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).replace(/^ /, ""))
            .join("\n");
          if (
            [
              "error",
              "status",
              "preparation",
              "source_prepared",
              "text_delta",
              "session_ready",
              "complete",
            ].includes(event)
          ) {
            let data: unknown;
            try {
              data = JSON.parse(text);
            } catch {
              throw apiFailure(
                "The lesson stream contained invalid JSON.",
                0,
                "invalid_response",
              );
            }
            if (event === "error") {
              const result = streamErrorSchema.safeParse(data);
              if (!result.success)
                throw apiFailure(
                  "The lesson stream contained unexpected data.",
                  0,
                  "invalid_response",
                );
              throw failureFromPayload(result.data, 0);
            }
            const result = schema.safeParse({ event, data });
            if (!result.success)
              throw apiFailure(
                "The lesson stream contained unexpected data.",
                0,
                "invalid_response",
              );
            onEvent(result.data);
            if (event === "complete") return;
          }
          delimiter = /\r?\n\r?\n/.exec(buffer);
        }
        if (done) break;
      }
      signal?.throwIfAborted();
      throw apiFailure("The lesson stream ended before generation completed.");
    } finally {
      signal?.removeEventListener("abort", abort);
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
}
