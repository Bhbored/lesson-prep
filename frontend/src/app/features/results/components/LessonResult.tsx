import type { useResultsPage } from "@/app/features/results/hooks/useResultsPage";
interface LessonResultProps {
  readonly model: Pick<
    ReturnType<typeof useResultsPage>,
    "t" | "activeVariant"
  >;
}
export function LessonResult({ model }: Readonly<LessonResultProps>) {
  const { t, activeVariant } = model;
  if (!activeVariant) return null;
  return (
    <>
      <article className="lesson-result text-ink">
        <div className="result-hero mb-5 rounded-xl bg-leaf-100 p-6 sm:p-7">
          <span className="eyebrow text-[11px] font-bold tracking-[0.14em] text-leaf-700 uppercase">
            {t.option} {activeVariant.variantNumber} · {activeVariant.provider}{" "}
            / {activeVariant.model}
          </span>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">{activeVariant.lesson.title}</h2>
          <p className="mt-1 text-sm text-muted">
            {t.topic}: {activeVariant.lesson.topic}
          </p>
          <div className="result-meta mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-leaf-700">{activeVariant.lesson.className}</span>
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-leaf-700">
              {activeVariant.lesson.totalDurationMinutes} {t.minutes}
            </span>
          </div>
        </div>
        <div className="result-summary mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="panel rounded-xl border border-line bg-paper p-5">
            <h3 className="mb-3 font-semibold">{t.objectives}</h3>
            <ul className="list-disc space-y-1 ps-5 text-sm leading-relaxed text-muted">
              {activeVariant.lesson.learningObjectives.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="panel rounded-xl border border-line bg-paper p-5">
            <h3 className="mb-3 font-semibold">{t.resources}</h3>
            <ul className="list-disc space-y-1 ps-5 text-sm leading-relaxed text-muted">
              {activeVariant.lesson.requiredMaterials.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="lesson-timeline relative ms-4 before:absolute before:inset-y-3 before:start-0 before:w-0.5 before:bg-leaf-200">
          {activeVariant.lesson.phases.map((phase, index) => (
            <section className="timeline-item relative mb-4 ps-8" key={index}>
              <div className="timeline-dot absolute -start-[13px] top-5 grid size-7 place-items-center rounded-full border-4 border-canvas bg-leaf-700 text-[11px] font-extrabold text-white">{index + 1}</div>
              <div className="panel timeline-panel rounded-xl border border-line bg-paper p-5">
                <div className="timeline-head flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold">{phase.name}</h3>
                  <span className="rounded-full bg-leaf-100 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-leaf-700">
                    {phase.durationMinutes} {t.minutes}
                  </span>
                </div>
                <p className="phase-objective my-3 text-sm text-muted">{phase.objective}</p>
                <div className="activity-grid grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="mb-2 text-xs font-semibold text-leaf-700">{t.teacher}</h4>
                    <ul className="list-disc space-y-1 ps-5 text-sm leading-relaxed text-muted">
                      {phase.teacherActions.map((action, i) => (
                        <li key={i}>{action}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="mb-2 text-xs font-semibold text-leaf-700">{t.students}</h4>
                    <ul className="list-disc space-y-1 ps-5 text-sm leading-relaxed text-muted">
                      {phase.studentActions.map((action, i) => (
                        <li key={i}>{action}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                {phase.questions?.length > 0 && (
                  <div className="question-block mt-4 rounded-lg bg-leaf-50 p-3">
                    <h4 className="mb-2 text-xs font-semibold text-leaf-700">{t.questions}</h4>
                    <ul className="list-disc space-y-1 ps-5 text-sm leading-relaxed text-muted">
                      {phase.questions.map((question, i) => (
                        <li key={i}>{question}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {phase.notes && <p className="phase-notes mt-3 text-xs text-muted">{phase.notes}</p>}
              </div>
            </section>
          ))}
        </div>
        <div className="result-summary mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="panel rounded-xl border border-line bg-paper p-5">
            <h3 className="mb-3 font-semibold">{t.assessment}</h3>
            <p className="text-sm leading-relaxed text-muted">{activeVariant.lesson.assessmentSummary}</p>
          </div>
          <div className="panel rounded-xl border border-line bg-paper p-5">
            <h3 className="mb-3 font-semibold">{t.outcomes}</h3>
            <ul className="list-disc space-y-1 ps-5 text-sm leading-relaxed text-muted">
              {activeVariant.lesson.expectedOutcomes.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        {activeVariant.lesson.teacherNotes && (
          <div className="panel teacher-notes mt-4 rounded-xl border border-line bg-paper p-5">
            <h3 className="mb-3 font-semibold">{t.notes}</h3>
            <p className="text-sm leading-relaxed text-muted">{activeVariant.lesson.teacherNotes}</p>
          </div>
        )}
      </article>
    </>
  );
}
