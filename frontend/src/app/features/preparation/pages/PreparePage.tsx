import { Link } from "react-router-dom";
import { displayedPhaseName } from "@/app/features/presets/standardFlow";
import { MaterialUpload } from "../components/MaterialUpload";
import {
  BookOpen,
  ChevronRight,
  RefreshCw,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import type { Language } from "@/app/shared/schemas/domain";
import { usePreparePage } from "@/app/features/preparation/hooks/usePreparePage";
export default function PreparePage() {
  const model = usePreparePage();
  const {
    fieldErrors,
    variantCount,
    settings,
    t,
    className,
    setClassName,
    duration,
    setDuration,
    sourceLanguage,
    setSourceLanguage,
    setVariantCount,
    busy,
    generate,
    selectedPresetId,
    setSelectedPresetId,
    allPresets,
    phaseTotal,
    selectedPreset,
    classChoices,
    providerNames,
  } = model;
  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">
            <Sparkles aria-hidden="true" size={13} /> {t.heroEyebrow}
          </span>
          <h1>{t.heroTitle}</h1>
          <p>{t.heroBody}</p>
        </div>
        <div className="hero-art">
          <div className="art-card art-back"></div>
          <div className="art-card art-front">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
          <span className="art-star star-one">✦</span>
          <span className="art-star star-two">✦</span>
        </div>
      </section>
      <div className="section-head">
        <div>
          <h2>{t.prepare}</h2>
          <p>{t.prepareHelp}</p>
        </div>
        <span className="step-label">01 / 04</span>
      </div>
      <div className="form-grid">
        <MaterialUpload model={model} />
        <section className="panel">
          <div className="panel-heading">
            <div className="panel-icon lavender">
              <BookOpen aria-hidden="true" size={20} />
            </div>
            <div>
              <h3>{t.classInfo}</h3>
              <p>{t.classHelp}</p>
            </div>
          </div>
          <div className="field-row">
            <label>
              {t.className}
              <select
                name="className"
                aria-invalid={Boolean(fieldErrors.className)}
                value={className}
                onChange={(event) => setClassName(event.target.value)}
                required
              >
                <option value="">
                  {settings.displayLanguage === "ar"
                    ? "اختر صفًا"
                    : "Select a class"}
                </option>
                {classChoices.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {settings.displayLanguage === "ar" ? choice.ar : choice.en}
                  </option>
                ))}
              </select>
              {fieldErrors.className && (
                <span className="validation-text" role="alert">
                  {fieldErrors.className}
                </span>
              )}
            </label>
            <label>
              {t.duration}
              <div className="number-wrap">
                <input
                  type="number"
                  min="10"
                  max="240"
                  name="totalDurationMinutes"
                  aria-invalid={Boolean(fieldErrors.totalDurationMinutes)}
                  value={duration}
                  onChange={(event) => setDuration(Number(event.target.value))}
                />
                <span>{t.minutes}</span>
              </div>
              {fieldErrors.totalDurationMinutes && (
                <span className="validation-text" role="alert">
                  {fieldErrors.totalDurationMinutes}
                </span>
              )}
            </label>
          </div>
          <label className="field-label">
            {t.sourceLanguage}
            <select
              name="sourceLanguage"
              value={sourceLanguage}
              onChange={(event) =>
                setSourceLanguage(event.target.value as Language)
              }
            >
              <option value="en">{t.english}</option>
              <option value="ar">{t.arabic}</option>
              <option value="fr">
                {settings.displayLanguage === "ar" ? "الفرنسية" : "French"}
              </option>
            </select>
          </label>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div className="panel-icon mint">
              <Sparkles aria-hidden="true" size={20} />
            </div>
            <div>
              <h3>{t.alternatives}</h3>
              <p>{t.alternativesHelp}</p>
            </div>
          </div>
          <div className="segmented">
            {[1, 2, 3].map((number) => (
              <button
                key={number}
                className={variantCount === number ? "selected" : ""}
                onClick={() => setVariantCount(number)}
              >
                {number}
              </button>
            ))}
          </div>
          <p className="subtle-info">
            {providerNames[settings.provider]} ·{" "}
            {settings.models[settings.provider] || t.selectModel}
          </p>
        </section>
        <section className="panel wide">
          <div className="panel-heading">
            <div className="panel-icon butter">
              <RefreshCw aria-hidden="true" size={20} />
            </div>
            <div>
              <h3>{t.flow}</h3>
              <p>{t.flowHelp}</p>
            </div>
          </div>
          <div className="flow-selector">
            <select
              name="preset"
              aria-invalid={Boolean(fieldErrors.preset)}
              value={selectedPresetId}
              onChange={(event) => setSelectedPresetId(event.target.value)}
            >
              {allPresets.map((preset) => (
                <option value={preset.id} key={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            <Link className="text-button" to="/presets">
              {t.edit} <ChevronRight aria-hidden="true" size={16} />
            </Link>
          </div>
          {fieldErrors.preset && (
            <p className="validation-text" role="alert">
              {fieldErrors.preset}
            </p>
          )}
          <div className="phase-preview">
            {selectedPreset?.phases.map((phase, index) => (
              <div className="phase-chip" key={`${phase.order}-${index}`}>
                <span className="phase-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <strong>{displayedPhaseName(selectedPreset, phase, sourceLanguage)}</strong>
                <span>
                  {phase.durationMinutes} {t.minutes}
                </span>
              </div>
            ))}
          </div>
          <div
            className={`flow-total ${phaseTotal !== duration ? "invalid" : ""}`}
          >
            <span>{t.total}</span>
            <strong>
              {phaseTotal} / {duration} {t.minutes}
            </strong>
          </div>
          {phaseTotal !== duration && (
            <p className="validation-text">{t.mismatch}</p>
          )}
        </section>
      </div>
      <div className="action-row">
        <button className="primary-button" disabled={busy} onClick={generate}>
          <WandSparkles aria-hidden="true" size={18} />
          {busy ? t.generating : t.generate}
          <ChevronRight aria-hidden="true" size={18} />
        </button>
      </div>
    </>
  );
}
