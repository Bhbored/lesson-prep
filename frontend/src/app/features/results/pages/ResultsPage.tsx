import { Link } from "react-router-dom";
import { LessonResult } from "../components/LessonResult";
import {
  ChevronRight,
  Download,
  FileText,
  LoaderCircle,
  RefreshCw,
  FileClock,
} from "lucide-react";
import { useResultsPage } from "@/app/features/results/hooks/useResultsPage";
export default function ResultsPage() {
  const model = useResultsPage();
  const {
    stage,
    settings,
    t,
    busy,
    providerNames,
    preparation,
    currentVariants,
    activeVariant,
    setActiveVariantId,
    regenerate,
    liveDraft,
    cancel,
    exportSelectedPdf,
    downloading,
  } = model;
  return (
    <div className="page-content pt-8">
      <div className="section-head mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow text-[11px] font-bold tracking-[0.14em] text-leaf-700 uppercase">{t.classroomOptions}</span>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{t.results}</h1>
          <p className="mt-1 text-sm text-muted">
            {preparation
              ? `${preparation.className} · ${preparation.totalDurationMinutes} ${t.minutes}`
              : t.emptyResults}
          </p>
        </div>
        <div className="detail-buttons flex flex-wrap gap-2">
          {activeVariant && (
            <button
              className="secondary-button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-leaf-800 hover:bg-leaf-50"
              disabled={busy || downloading}
              aria-busy={downloading}
              onClick={exportSelectedPdf}
            >
              {downloading ? <LoaderCircle aria-hidden="true" size={16} className="animate-spin" /> : <Download aria-hidden="true" size={16} />}
              {t.exportPdf}
            </button>
          )}
          {preparation && (
            <button
              className="secondary-button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-leaf-800 hover:bg-leaf-50"
              disabled={busy}
              onClick={regenerate}
            >
              <RefreshCw
                aria-hidden="true"
                size={16}
                className={busy ? "animate-spin" : ""}
              />
              {t.regenerate}
            </button>
          )}
        </div>
      </div>
      {busy && (
        <div className="processing-card mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-leaf-200 bg-leaf-100 p-4 text-leaf-800">
          <LoaderCircle aria-hidden="true" className="animate-spin" size={19} />
          <div>
            <strong className="block text-sm">
              {stage === "variant"
                ? `${t.generating} ${t.option}`
                : t.processing}
            </strong>
            <span className="mt-0.5 block text-xs text-muted">
              {providerNames[settings.provider]} ·{" "}
              {settings.models[settings.provider]}
            </span>
          </div>
          <button className="secondary-button small ms-auto inline-flex min-h-11 items-center justify-center rounded-lg border border-leaf-300 bg-white px-4 py-2 text-sm font-semibold text-leaf-800" onClick={cancel}>
            {t.cancel}
          </button>
        </div>
      )}
      {busy && liveDraft && (
        <div className="panel live-panel mb-5 rounded-xl border border-line bg-paper p-5">
          <div className="panel-heading mb-5 flex items-center gap-3">
            <div className="panel-icon butter grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <FileClock aria-hidden="true" size={19} />
            </div>
            <div>
              <h3 className="font-semibold">{t.live}</h3>
              <p className="mt-0.5 text-xs text-muted">{t.liveHelp}</p>
            </div>
          </div>
          <pre className="max-h-56 overflow-auto break-words whitespace-pre-wrap rounded-lg bg-leaf-50 p-3 text-xs text-muted">{liveDraft}</pre>
        </div>
      )}
      {currentVariants.length > 0 ? (
        <>
          <div className="variant-tabs mb-5 flex gap-2 overflow-x-auto pb-1">
            {currentVariants.map((variant) => (
              <button
                key={variant.id}
                className={`flex min-w-40 max-w-56 shrink-0 flex-col gap-1 rounded-lg border px-4 py-3 text-start text-sm font-semibold ${activeVariant?.id === variant.id ? "active border-leaf-500 bg-leaf-50 text-leaf-800" : "border-line bg-white text-muted hover:border-leaf-500"}`}
                onClick={() => setActiveVariantId(variant.id)}
              >
                {t.option} {variant.variantNumber}
                <span className="w-full truncate text-xs font-normal text-muted">{variant.lesson.title}</span>
              </button>
            ))}
          </div>
          {activeVariant && <LessonResult model={model} />}
        </>
      ) : (
        !busy && (
          <div className="empty-state flex min-h-72 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-leaf-200 bg-white text-center text-muted">
            <div className="grid size-16 place-items-center rounded-2xl bg-leaf-100 text-leaf-700">
              <FileText aria-hidden="true" size={34} />
            </div>
            <h2 className="max-w-72 text-lg font-semibold">{t.emptyResults}</h2>
            <Link className="primary-button small inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-leaf-700 px-4 py-2 text-sm font-semibold text-white hover:bg-leaf-800" to="/prepare">
              {t.prepare}
              <ChevronRight aria-hidden="true" size={17} />
            </Link>
          </div>
        )
      )}
    </div>
  );
}
