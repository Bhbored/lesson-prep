import { useRef, useState } from "react";
import { downloadLessonPdf } from "../utils/downloadLessonPdf";

export function useDownloadLesson(onError: () => void) {
  const [downloadingKey, setDownloadingKey] = useState("");
  const active = useRef(false);

  async function download(
    element: HTMLElement,
    variantNumber: number,
    sessionNumber: number,
  ) {
    const key = `${variantNumber}-${sessionNumber}`;
    if (!variantNumber || active.current) return;
    active.current = true;
    setDownloadingKey(key);
    try {
      await downloadLessonPdf(element, variantNumber, sessionNumber);
    } catch {
      onError();
    } finally {
      active.current = false;
      setDownloadingKey("");
    }
  }

  return { download, downloadingKey };
}
