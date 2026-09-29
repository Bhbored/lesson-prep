import { Link } from "react-router-dom";
import { displayedPhaseName } from "@/app/features/presets/standardFlow";
import { MaterialUpload } from "../components/MaterialUpload";
import {
  BookOpen,
  ChevronRight,
  FilePenLine,
  Layers3,
  ListOrdered,
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
      <section className="hero relative my-8 flex min-h-56 items-center justify-between overflow-hidden rounded-2xl bg-leaf-100 px-7 py-9 text-ink sm:px-11">
        <div className="relative z-10">
          <span className="eyebrow mb-3 block text-[11px] font-bold tracking-[0.14em] text-leaf-700 uppercase">{t.heroEyebrow}</span>
          <h1 className="max-w-2xl font-display text-3xl leading-tight font-bold tracking-tight text-ink sm:text-[2.6rem]">{t.heroTitle}</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-leaf-800">{t.heroBody}</p>
        </div>
        <div className="hero-art relative hidden h-36 w-44 shrink-0 md:block rtl:scale-x-[-1]" aria-hidden="true">
          <div className="art-card art-back absolute inset-y-4 start-8 w-28 rotate-12 rounded-xl border border-leaf-200 bg-leaf-50 shadow-sm"></div>
          <div className="art-card art-front absolute inset-y-2 start-4 flex w-28 -rotate-6 flex-col gap-3 rounded-xl border border-leaf-200 bg-white p-5 shadow-md">
            <div className="h-3 w-3/4 rounded bg-leaf-300"></div>
            <div className="h-1.5 w-full rounded bg-leaf-100"></div>
            <div className="h-1.5 w-5/6 rounded bg-leaf-100"></div>
            <div className="mt-auto h-7 w-7 rounded-full bg-leaf-200"></div>
          </div>
        </div>
      </section>
      <div className="section-head mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">{t.prepare}</h2>
          <p className="mt-1 text-sm text-muted">{t.prepareHelp}</p>
        </div>
        <span className="step-label text-xs font-bold tracking-wider text-muted">01 / 04</span>
      </div>
      <div className="form-grid grid grid-cols-1 gap-5 md:grid-cols-2">
        <MaterialUpload model={model} />
        <section className="panel rounded-xl border border-line bg-paper p-5 sm:p-6">
          <div className="panel-heading mb-5 flex items-center gap-3">
            <div className="panel-icon lavender grid size-10 shrink-0 place-items-center rounded-xl bg-leaf-100 text-leaf-700">
              <BookOpen aria-hidden="true" size={20} />
            </div>
            <div>
              <h3 className="font-semibold">{t.classInfo}</h3>
              <p className="mt-0.5 text-xs text-muted">{t.classHelp}</p>
            </div>
          </div>
          <div className="field-row grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
            <label className="block text-xs font-semibold text-muted">
              {t.className}
              <select
                className="mt-2 block min-h-11 w-full rounded-lg border border-[#7a9982] bg-white px-3 py-2 text-sm text-ink focus-visible:border-leaf-600 focus-visible:ring-2 focus-visible:ring-leaf-200"
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
                <span className="validation-text mt-1 block text-xs text-red-700" role="alert">
                  {fieldErrors.className}
                </span>
              )}
            </label>
            <label className="block text-xs font-semibold text-muted">
              {t.duration}
              <div className="number-wrap relative">
                <input
                  className="mt-2 block min-h-11 w-full rounded-lg border border-[#7a9982] bg-white px-3 py-2 pe-14 text-sm text-ink focus-visible:border-leaf-600 focus-visible:ring-2 focus-visible:ring-leaf-200"
                  type="number"
                  min="10"
                  max="240"
                  name="totalDurationMinutes"
                  aria-invalid={Boolean(fieldErrors.totalDurationMinutes)}
                  value={duration}
                  onChange={(event) => setDuration(Number(event.target.value))}
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/3 text-xs text-muted">{t.minutes}</span>
              </div>
              {fieldErrors.totalDurationMinutes && (
                <span className="validation-text mt-1 block text-xs text-red-700" role="alert">
                  {fieldErrors.totalDurationMinutes}
                </span>
              )}
            </label>
          </div>
          <label className="field-label mt-4 block text-xs font-semibold text-muted">
            {t.sourceLanguage}
            <select
              className="mt-2 block min-h-11 w-full rounded-lg border border-[#7a9982] bg-white px-3 py-2 text-sm text-ink focus-visible:border-leaf-600 focus-visible:ring-2 focus-visible:ring-leaf-200"
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
        <section className="panel rounded-xl border border-line bg-paper p-5 sm:p-6">
          <div className="panel-heading mb-5 flex items-center gap-3">
            <div className="panel-icon mint grid size-10 shrink-0 place-items-center rounded-xl bg-leaf-100 text-leaf-700">
              <Layers3 aria-hidden="true" size={20} />
            </div>
            <div>
              <h3 className="font-semibold">{t.alternatives}</h3>
              <p className="mt-0.5 text-xs text-muted">{t.alternativesHelp}</p>
            </div>
          </div>
          <div className="segmented flex gap-2">
            {[1, 2, 3].map((number) => (
              <button
                key={number}
                className={`min-h-11 min-w-12 rounded-lg border px-4 font-semibold ${variantCount === number ? "selected border-leaf-300 bg-leaf-100 text-leaf-800" : "border-line bg-white text-muted hover:border-leaf-300"}`}
                onClick={() => setVariantCount(number)}
              >
                {number}
              </button>
            ))}
          </div>
          <p className="subtle-info mt-3 text-xs text-muted">
            {providerNames[settings.provider]} ·{" "}
            {settings.models[settings.provider] || t.selectModel}
          </p>
        </section>
        <section className="panel wide col-span-full rounded-xl border border-line bg-paper p-5 sm:p-6">
          <div className="panel-heading mb-5 flex items-center gap-3">
            <div className="panel-icon butter grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <ListOrdered aria-hidden="true" size={20} />
            </div>
            <div>
              <h3 className="font-semibold">{t.flow}</h3>
              <p className="mt-0.5 text-xs text-muted">{t.flowHelp}</p>
            </div>
          </div>
          <div className="flow-selector mb-5 flex flex-wrap items-center gap-3">
            <select
              className="min-h-11 min-w-0 flex-1 rounded-lg border border-[#7a9982] bg-white px-3 py-2 text-sm text-ink sm:max-w-sm"
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
            <Link className="text-button inline-flex min-h-11 items-center gap-1 text-xs font-bold text-leaf-700 hover:underline" to="/presets">
              {t.edit} <ChevronRight aria-hidden="true" size={16} />
            </Link>
          </div>
          {fieldErrors.preset && (
            <p className="validation-text mt-1 text-xs text-red-700" role="alert">
              {fieldErrors.preset}
            </p>
          )}
          <div className="phase-preview grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {selectedPreset?.phases.map((phase, index) => (
              <div className="phase-chip flex min-h-24 min-w-0 flex-col gap-1 rounded-lg border border-line bg-leaf-50 p-3" key={`${phase.order}-${index}`}>
                <span className="phase-index grid size-6 shrink-0 place-items-center rounded-md bg-leaf-100 text-[10px] font-extrabold text-leaf-700">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <strong className="break-words text-xs">{displayedPhaseName(selectedPreset, phase, sourceLanguage)}</strong>
                <span className="text-xs text-muted">
                  {phase.durationMinutes} {t.minutes}
                </span>
              </div>
            ))}
          </div>
          <div
            className={`flow-total mt-5 flex justify-between gap-3 border-t border-line pt-4 text-xs text-muted ${phaseTotal !== duration ? "invalid" : ""}`}
          >
            <span>{t.total}</span>
            <strong className={phaseTotal !== duration ? "text-red-700" : "text-leaf-700"}>
              {phaseTotal} / {duration} {t.minutes}
            </strong>
          </div>
          {phaseTotal !== duration && (
            <p className="validation-text mt-1 text-xs text-red-700">{t.mismatch}</p>
          )}
        </section>
      </div>
      <div className="action-row mt-6 flex justify-end">
        <button className="primary-button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-leaf-700 px-5 py-2 text-sm font-semibold text-white hover:bg-leaf-800" disabled={busy} onClick={generate}>
          <FilePenLine aria-hidden="true" size={18} />
          {busy ? t.generating : t.generate}
          <ChevronRight aria-hidden="true" size={18} />
        </button>
      </div>
    </>
  );
}
