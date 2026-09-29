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
      <article className="lesson-result">
        <div className="result-hero">
          <span className="eyebrow">
            {t.option} {activeVariant.variantNumber} · {activeVariant.provider}{" "}
            / {activeVariant.model}
          </span>
          <h2>{activeVariant.lesson.title}</h2>
          <p>
            {t.topic}: {activeVariant.lesson.topic}
          </p>
          <div className="result-meta">
            <span>{activeVariant.lesson.className}</span>
            <span>
              {activeVariant.lesson.totalDurationMinutes} {t.minutes}
            </span>
          </div>
        </div>
        <div className="result-summary">
          <div className="panel">
            <h3>{t.objectives}</h3>
            <ul>
              {activeVariant.lesson.learningObjectives.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="panel">
            <h3>{t.resources}</h3>
            <ul>
              {activeVariant.lesson.requiredMaterials.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="lesson-timeline">
          {activeVariant.lesson.phases.map((phase, index) => (
            <section className="timeline-item" key={index}>
              <div className="timeline-dot">{index + 1}</div>
              <div className="panel timeline-panel">
                <div className="timeline-head">
                  <h3>{phase.name}</h3>
                  <span>
                    {phase.durationMinutes} {t.minutes}
                  </span>
                </div>
                <p className="phase-objective">{phase.objective}</p>
                <div className="activity-grid">
                  <div>
                    <h4>{t.teacher}</h4>
                    <ul>
                      {phase.teacherActions.map((action, i) => (
                        <li key={i}>{action}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4>{t.students}</h4>
                    <ul>
                      {phase.studentActions.map((action, i) => (
                        <li key={i}>{action}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                {phase.questions?.length > 0 && (
                  <div className="question-block">
                    <h4>{t.questions}</h4>
                    <ul>
                      {phase.questions.map((question, i) => (
                        <li key={i}>{question}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {phase.notes && <p className="phase-notes">{phase.notes}</p>}
              </div>
            </section>
          ))}
        </div>
        <div className="result-summary">
          <div className="panel">
            <h3>{t.assessment}</h3>
            <p>{activeVariant.lesson.assessmentSummary}</p>
          </div>
          <div className="panel">
            <h3>{t.outcomes}</h3>
            <ul>
              {activeVariant.lesson.expectedOutcomes.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        {activeVariant.lesson.teacherNotes && (
          <div className="panel teacher-notes">
            <h3>{t.notes}</h3>
            <p>{activeVariant.lesson.teacherNotes}</p>
          </div>
        )}
      </article>
    </>
  );
}
