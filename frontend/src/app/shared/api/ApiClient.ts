import type { z } from "zod";
import { apiFailure, responseFailure } from "./errors";

export class ApiClient {
  readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(
    baseUrl = "/lessonprep/v1.0",
    fetchImpl: typeof fetch = (...args) => fetch(...args),
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.fetchImpl = fetchImpl;
  }

  async requestStream(path: string, options: RequestInit): Promise<Response> {
    const response = await this.fetchImpl(
      `${this.baseUrl}/${path.replace(/^\/+/, "")}`,
      options,
    );
    if (!response.ok) throw await responseFailure(response);
    return response;
  }

  async requestJson<T>(
    path: string,
    schema: z.ZodType<T>,
    options: RequestInit = {},
  ): Promise<T> {
    const response = await this.requestStream(path, options);
    const data: unknown = await response.json().catch(() => {
      throw apiFailure(
        "The server returned invalid JSON.",
        response.status,
        "invalid_response",
      );
    });
    const result = schema.safeParse(data);
    if (!result.success)
      throw apiFailure(
        "The server returned unexpected data.",
        response.status,
        "invalid_response",
      );
    return result.data;
  }
}
