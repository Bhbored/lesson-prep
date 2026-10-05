import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import type { ExerciseSet } from "@/app/shared/schemas/domain";
import type { useI18n } from "@/app/providers/i18n";

interface ExerciseSetViewProps {
  readonly set: ExerciseSet;
  readonly t: ReturnType<typeof useI18n>;
  readonly kind: "worksheet" | "quiz";
  readonly downloading?: boolean;
  readonly onExport?: (element: HTMLElement) => void;
}

export function ExerciseSetView({
  set,
  t,
  kind,
  downloading = false,
  onExport,
}: Readonly<ExerciseSetViewProps>) {
  const [showAnswers, setShowAnswers] = useState(false);

  return (
    <article className="lesson-result exercise-set mt-4 text-ink">
      <div className="result-hero mb-5 rounded-xl bg-leaf-100 p-6 sm:p-7">
        <span className="eyebrow text-[11px] font-bold tracking-[0.14em] text-leaf-700 uppercase">
          {kind === "quiz" ? t.quiz : t.worksheet}
        </span>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          {set.title}
        </h2>
        {set.instructions && (
          <p className="mt-2 text-sm text-muted">{set.instructions}</p>
        )}
      </div>
      <ol className="space-y-4">
        {set.items.map((item, index) => (
          <li
            key={`${item.prompt}-${index}`}
            className="panel rounded-xl border border-line bg-paper p-5"
          >
            <p className="text-xs font-bold tracking-[0.1em] text-leaf-700 uppercase">
              {t.exercise} {index + 1}
            </p>
            <p className="mt-2 font-semibold">{item.prompt}</p>
            {item.options.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-sm">
                {item.options.map((option) => (
                  <li key={option} className="rounded-lg bg-leaf-50 px-3 py-2">
                    {option}
                  </li>
                ))}
              </ul>
            )}
            {item.type === "fill_blank" && (
              <div className="mt-3 border-b border-line pb-6" />
            )}
            {item.type === "short" && (
              <div className="mt-3 min-h-16 rounded-lg border border-dashed border-line" />
            )}
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="secondary-button inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-leaf-800 hover:bg-leaf-50"
          aria-expanded={showAnswers}
          onClick={() => setShowAnswers((value) => !value)}
        >
          {showAnswers ? t.hideAnswers : t.showAnswers}
        </button>
        {onExport && (
          <button
            type="button"
            className="secondary-button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-leaf-800 hover:bg-leaf-50"
            disabled={downloading}
            aria-busy={downloading}
            onClick={(event) => {
              const article = event.currentTarget.closest<HTMLElement>(
                ".exercise-set",
              );
              if (article) onExport(article);
            }}
          >
            {downloading ? (
              <LoaderCircle
                aria-hidden="true"
                size={16}
                className="animate-spin"
              />
            ) : (
              <Download aria-hidden="true" size={16} />
            )}
            {t.exportPdf}
          </button>
        )}
      </div>
      {showAnswers && (
        <section className="panel mt-4 rounded-xl border border-line bg-paper p-5">
          <h3 className="mb-3 font-semibold">{t.answerKey}</h3>
          <ol className="space-y-3">
            {set.items.map((item, index) => (
              <li key={`answer-${item.prompt}-${index}`}>
                <p className="text-sm font-semibold">
                  {index + 1}. {item.answer}
                </p>
                {item.explanation && (
                  <p className="mt-1 text-sm text-muted">{item.explanation}</p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </article>
  );
}
