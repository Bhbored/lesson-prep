import { afterEach, expect, it, vi } from "vitest";
import { downloadLessonPdf } from "./downloadLessonPdf";
import { deferred } from "@/test/fixtures";

const mock = vi.hoisted(() => ({
  set: vi.fn(), from: vi.fn(), toContainer: vi.fn(), get: vi.fn(), save: vi.fn(),
}));
vi.mock("html2pdf.js", () => ({ default: () => mock }));
afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
  document.body.replaceChildren();
});

function configureWorker() {
  const overlay = document.createElement("div");
  document.body.append(overlay);
  mock.set.mockReturnValue(mock);
  mock.from.mockReturnValue(mock);
  mock.toContainer.mockReturnValue(mock);
  mock.get.mockImplementation((_key, callback) => {
    callback(overlay);
    return Promise.resolve();
  });
  return overlay;
}

it("exports an immutable RTL snapshot with the clicked result number and timestamp", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-29T12:34:56.789Z"));
  const fonts = deferred<void>();
  Object.defineProperty(document, "fonts", { configurable: true, value: { ready: fonts.promise } });
  const source = document.createElement("article");
  source.className = "lesson-result";
  source.style.direction = "rtl";
  source.textContent = "الدرس الأول";
  document.body.append(source);
  const overlay = configureWorker();
  mock.save.mockResolvedValue(undefined);

  const download = downloadLessonPdf(source, 2);
  source.textContent = "A different result selected while export loads";
  fonts.resolve();
  await download;

  const snapshot = mock.from.mock.calls[0][0] as HTMLElement;
  expect(snapshot.textContent).toBe("الدرس الأول");
  expect(snapshot.dir).toBe("rtl");
  expect(source.classList.contains("pdf-export")).toBe(false);
  expect(mock.set.mock.calls[0][0].filename).toBe("result_2_2026-09-29T12-34-56-789Z.pdf");
  expect(overlay.isConnected).toBe(false);
});

it("removes the rendering overlay when PDF generation fails", async () => {
  Object.defineProperty(document, "fonts", { configurable: true, value: { ready: Promise.resolve() } });
  const overlay = configureWorker();
  mock.save.mockRejectedValue(new Error("Canvas rendering failed"));

  await expect(downloadLessonPdf(document.createElement("article"), 1)).rejects.toThrow("Canvas rendering failed");

  expect(overlay.isConnected).toBe(false);
});
