import { useRef, useState } from "react";
import { downloadLessonPdf } from "../utils/downloadLessonPdf";

export function useDownloadLesson(variantNumber: number | undefined, onError: () => void) {
  const [downloading, setDownloading] = useState(false);
  const active = useRef(false);

  async function download() {
    if (!variantNumber || active.current) return;
    const element = document.querySelector<HTMLElement>(".lesson-result");
    if (!element) return;
    active.current = true;
    setDownloading(true);
    try {
      await downloadLessonPdf(element, variantNumber);
    } catch {
      onError();
    } finally {
      active.current = false;
      setDownloading(false);
    }
  }

  return { download, downloading };
}
