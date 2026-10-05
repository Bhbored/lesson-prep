import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Save, X } from "lucide-react";
import type { useI18n } from "@/app/providers/i18n";
import type { useSessionTools } from "../hooks/useSessionTools";

interface SessionToolSheetProps {
  readonly tools: ReturnType<typeof useSessionTools>;
  readonly t: ReturnType<typeof useI18n>;
}

export function SessionToolSheet({ tools, t }: Readonly<SessionToolSheetProps>) {
  const titleId = useId();
  const [tick, setTick] = useState(0);
  const { close, loading, open, tool } = tools;
  const phrases = useMemo(() => {
    if (tool === "quiz") return [t.craftingQuiz1, t.craftingQuiz2, t.craftingQuiz3];
    if (tool === "game") return [t.craftingGame1, t.craftingGame2, t.craftingGame3];
    return [t.craftingWorksheet1, t.craftingWorksheet2, t.craftingWorksheet3];
  }, [t, tool]);

  useEffect(() => {
    if (!loading) return;
    const id = window.setInterval(() => setTick((value) => value + 1), 2200);
    return () => window.clearInterval(id);
  }, [loading]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, open]);

  if (!open) return null;
  const title = tool ? t[tool] : t.sessionTools;
  const readyTitle = tools.game?.title ?? tools.exercise?.title ?? title;
  const readyHook = tools.game?.hook ?? tools.exercise?.instructions ?? "";

  return createPortal(
    <div
      className="tool-sheet-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) tools.close();
      }}
    >
      <div
        className="tool-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-[0.14em] text-leaf-700 uppercase">
              {t.sessionTools}
            </p>
            <h2 id={titleId} className="mt-1 font-display text-2xl font-semibold">
              {loading ? title : readyTitle}
            </h2>
          </div>
          <button
            type="button"
            className="secondary-button inline-flex size-11 items-center justify-center rounded-lg border border-line bg-white text-leaf-800 hover:bg-leaf-50"
            aria-label={t.closeSheet}
            title={t.closeSheet}
            onClick={close}
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        {loading && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="think" aria-hidden="true">
              <span className="think-core" />
              <span className="think-spark" />
              <span className="think-spark think-spark-b" />
              <span className="think-spark think-spark-c" />
            </div>
            <p className="mt-5 font-display text-lg font-semibold text-ink">
              {phrases[tick % phrases.length]}
            </p>
            <p className="mt-2 text-sm text-muted">{t.craftingHint}</p>
          </div>
        )}
        {!loading && tools.failed && (
          <div>
            <p className="text-sm text-rose-700" role="alert">
              {tools.failed}
            </p>
            <button
              type="button"
              className="primary-button mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-leaf-700 px-4 py-2 text-sm font-semibold text-white hover:bg-leaf-800"
              onClick={tools.retry}
            >
              {t.retryTool}
            </button>
          </div>
        )}
        {!loading && !tools.failed && (tools.exercise || tools.game) && (
          <div>
            <p className="text-sm font-semibold text-leaf-800">{t.toolReady}</p>
            {readyHook && <p className="mt-2 text-sm text-muted">{readyHook}</p>}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                className="primary-button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-leaf-700 px-4 py-2 text-sm font-semibold text-white hover:bg-leaf-800"
                onClick={tools.preview}
              >
                <ExternalLink aria-hidden="true" size={16} />
                {t.previewLive}
              </button>
              <button
                type="button"
                className="secondary-button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-leaf-800 hover:bg-leaf-50"
                onClick={tools.save}
              >
                <Save aria-hidden="true" size={16} />
                {t.saveActivity}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
