import { Link } from "react-router-dom";
import { LessonResult } from "../components/LessonResult";
import {
  ChevronRight,
  Download,
  FileText,
  LoaderCircle,
  RefreshCw,
  Sparkles,
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
  } = model;
  return (
    <div className="page-content">
      <div className="section-head">
        <div>
          <span className="eyebrow">{t.classroomOptions}</span>
          <h1>{t.results}</h1>
          <p>
            {preparation
              ? `${preparation.className} · ${preparation.totalDurationMinutes} ${t.minutes}`
              : t.emptyResults}
          </p>
        </div>
        <div className="detail-buttons">
          {activeVariant && (
            <button
              className="secondary-button"
              disabled={busy}
              onClick={exportSelectedPdf}
            >
              <Download aria-hidden="true" size={16} />
              {t.exportPdf}
            </button>
          )}
          {preparation && (
            <button
              className="secondary-button"
              disabled={busy}
              onClick={regenerate}
            >
              <RefreshCw
                aria-hidden="true"
                size={16}
                className={busy ? "spin" : ""}
              />
              {t.regenerate}
            </button>
          )}
        </div>
      </div>
      {busy && (
        <div className="processing-card">
          <LoaderCircle aria-hidden="true" className="spin" size={19} />
          <div>
            <strong>
              {stage === "variant"
                ? `${t.generating} ${t.option}`
                : t.processing}
            </strong>
            <span>
              {providerNames[settings.provider]} ·{" "}
              {settings.models[settings.provider]}
            </span>
          </div>
          <button className="secondary-button small" onClick={cancel}>
            {t.cancel}
          </button>
        </div>
      )}
      {busy && liveDraft && (
        <div className="panel live-panel">
          <div className="panel-heading">
            <div className="panel-icon butter">
              <Sparkles aria-hidden="true" size={19} />
            </div>
            <div>
              <h3>{t.live}</h3>
              <p>{t.liveHelp}</p>
            </div>
          </div>
          <pre>{liveDraft}</pre>
        </div>
      )}
      {currentVariants.length > 0 ? (
        <>
          <div className="variant-tabs">
            {currentVariants.map((variant) => (
              <button
                key={variant.id}
                className={activeVariant?.id === variant.id ? "active" : ""}
                onClick={() => setActiveVariantId(variant.id)}
              >
                {t.option} {variant.variantNumber}
                <span>{variant.lesson.title}</span>
              </button>
            ))}
          </div>
          {activeVariant && <LessonResult model={model} />}
        </>
      ) : (
        !busy && (
          <div className="empty-state">
            <div>
              <FileText aria-hidden="true" size={34} />
            </div>
            <h2>{t.emptyResults}</h2>
            <Link className="primary-button small" to="/prepare">
              {t.prepare}
              <ChevronRight aria-hidden="true" size={17} />
            </Link>
          </div>
        )
      )}
    </div>
  );
}
