import { useEffect, useState } from "react";

export function usePrintLesson(title?: string) {
  const [requested, setRequested] = useState(false);
  useEffect(() => {
    if (!requested || !title) return;
    const original = document.title;
    const restore = () => {
      document.title = original;
      setRequested(false);
    };
    document.title =
      title
        .replace(/[\\/:*?"<>|]/g, "-")
        .trim()
        .slice(0, 100) || "lesson-plan";
    window.addEventListener("afterprint", restore, { once: true });
    window.print();
    return () => {
      window.removeEventListener("afterprint", restore);
      document.title = original;
    };
  }, [requested, title]);
  return () => {
    if (title) setRequested(true);
  };
}
