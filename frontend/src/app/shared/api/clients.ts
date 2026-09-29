import { ApiClient } from "./ApiClient";
import { SseClient } from "./SseClient";

export const apiClient = new ApiClient(
  import.meta.env.VITE_API_URL || "/lessonprep/v1.0",
);
export const sseClient = new SseClient();
