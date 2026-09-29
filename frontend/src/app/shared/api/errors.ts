import { z } from "zod";

export type ApiFailure = Error & {
  status: number;
  code: string;
  fieldErrors: Record<string, string[]>;
};
const errorSchema = z.object({
  message: z.string().optional(),
  detail: z.string().optional(),
  title: z.string().optional(),
  code: z.string().optional(),
  errors: z.record(z.string(), z.array(z.string())).optional(),
});
export const streamErrorSchema = errorSchema.refine(
  (value) =>
    Boolean(
      value.message ||
      value.detail ||
      value.title ||
      Object.keys(value.errors ?? {}).length,
    ),
  "Expected a backend error message.",
);
export function apiFailure(
  message: string,
  status = 0,
  code = "request_error",
  fieldErrors: Record<string, string[]> = {},
): ApiFailure {
  return Object.assign(new Error(message), {
    name: "ApiFailure",
    status,
    code,
    fieldErrors,
  });
}
export function failureFromPayload(
  payload: unknown,
  status: number,
): ApiFailure {
  const result = errorSchema.safeParse(payload);
  const data = result.success ? result.data : {};
  return apiFailure(
    data.message ||
      data.detail ||
      Object.values(data.errors ?? {})
        .flat()
        .join(" ") ||
      data.title ||
      (status === 429
        ? "Too many requests. Please try again shortly."
        : `Request failed (${status})`),
    status,
    data.code,
    data.errors,
  );
}
export async function responseFailure(response: Response): Promise<ApiFailure> {
  const payload: unknown = await response.json().catch(() => null);
  return failureFromPayload(payload, response.status);
}
export function retryRead(failureCount: number, error: Error): boolean {
  if (failureCount >= 1 || error.name === "AbortError") return false;
  if ("code" in error && error.code === "invalid_response") return false;
  return (
    !("status" in error) || Number(error.status) >= 500 || error.status === 0
  );
}
