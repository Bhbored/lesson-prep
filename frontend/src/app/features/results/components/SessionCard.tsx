import { useRef, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ClipboardList,
  Download,
  Gamepad2,
  ListChecks,
  LoaderCircle,
} from "lucide-react";
import type { Lesson, SessionTool } from "@/app/shared/schemas/domain";
import type { useI18n } from "@/app/providers/i18n";
import { LessonResult } from "./LessonResult";
import { ExerciseSetView } from "./ExerciseSetView";
import { GamePanel } from "./GamePanel";
import { useSessionTools } from "../hooks/useSessionTools";

interface SessionCardProps {
  readonly lesson: Lesson;
  readonly sessionNumber: number;
  readonly sessionCount: number;
  readonly variantNumber: number;
  readonly t: ReturnType<typeof useI18n>;
  readonly initiallyExpanded?: boolean;
  readonly downloading: boolean;
  readonly onExport: (element: HTMLElement) => void;
}

export function SessionCard({
  lesson,
  sessionNumber,
  sessionCount,
  variantNumber,
  t,
  initiallyExpanded = false,
  downloading,
  onExport,
}: Readonly<SessionCardProps>) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const articleRef = useRef<HTMLDivElement>(null);
  const tools = useSessionTools(lesson, variantNumber, sessionNumber);
  const label = `${t.session} ${sessionNumber} ${t.of} ${sessionCount}`;
  const toolButtons: { name: SessionTool; icon: ReactNode }[] = [
    { name: "worksheet", icon: <ClipboardList aria-hidden="true" size={18} /> },
    { name: "quiz", icon: <ListChecks aria-hidden="true" size={18} /> },
    { name: "game", icon: <Gamepad2 aria-hidden="true" size={18} /> },
  ];

  return (
    <section className="session-card mb-4 overflow-hidden rounded-xl border border-line bg-paper">
      <div className="session-card-header flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
        <button
          type="button"
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-start"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          <ChevronDown
            aria-hidden="true"
            size={18}
            className={`shrink-0 text-leaf-700 transition-transform duration-300 ease-out ${expanded ? "rotate-0" : "-rotate-90"}`}
          />
          <span className="min-w-0">
            <span className="block text-[11px] font-bold tracking-[0.12em] text-leaf-700 uppercase">
              {label}
            </span>
            <span className="mt-0.5 block truncate font-display text-lg font-semibold text-ink">
              {lesson.title}
            </span>
            <span className="mt-0.5 block text-xs text-muted">
              {lesson.totalDurationMinutes} {t.minutes}
            </span>
          </span>
        </button>
        <div
          className="flex shrink-0 items-center gap-2"
          role="group"
          aria-label={t.sessionTools}
        >
          {toolButtons.map(({ name, icon }) => (
            <button
              key={name}
              type="button"
              className="secondary-button inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-leaf-800 hover:bg-leaf-50 disabled:opacity-60"
              disabled={Boolean(tools.loading)}
              aria-busy={tools.loading === name}
              aria-label={t[name]}
              title={t[name]}
              onClick={() => {
                setExpanded(true);
                tools.generate(name);
              }}
            >
              {tools.loading === name ? (
                <LoaderCircle
                  aria-hidden="true"
                  size={18}
                  className="animate-spin"
                />
              ) : (
                icon
              )}
            </button>
          ))}
          <button
            type="button"
            className="secondary-button inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-leaf-800 hover:bg-leaf-50"
            disabled={downloading}
            aria-busy={downloading}
            aria-label={`${t.exportPdf}: ${label}`}
            title={t.exportPdf}
            onClick={() => {
              const element =
                articleRef.current?.querySelector<HTMLElement>(".lesson-result");
              if (element) onExport(element);
            }}
          >
            {downloading ? (
              <LoaderCircle
                aria-hidden="true"
                size={18}
                className="animate-spin"
              />
            ) : (
              <Download aria-hidden="true" size={18} />
            )}
          </button>
        </div>
      </div>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            ref={articleRef}
            className={`session-card-body p-4 sm:p-5 transition-opacity duration-300 ease-out ${expanded ? "opacity-100" : "opacity-0"}`}
            inert={!expanded || undefined}
          >
            <LessonResult
              key={sessionNumber}
              lesson={lesson}
              t={t}
              eyebrow={`${t.option} ${variantNumber} · ${label}`}
            />
            {(tools.loading ||
              tools.failed ||
              tools.exercise ||
              tools.game) && (
              <div className="session-tools mt-6 border-t border-line pt-4">
                {tools.loading && (
                  <p className="text-sm text-muted">{t.generatingTool}</p>
                )}
                {tools.failed && (
                  <p className="text-sm text-rose-700" role="alert">
                    {tools.failed}
                  </p>
                )}
                {tools.exercise &&
                  (tools.tool === "worksheet" || tools.tool === "quiz") && (
                    <ExerciseSetView
                      set={tools.exercise}
                      t={t}
                      kind={tools.tool}
                      downloading={tools.exporting}
                      onExport={tools.exportExercise}
                    />
                  )}
                {tools.game && tools.tool === "game" && (
                  <GamePanel
                    game={tools.game}
                    t={t}
                    onDownload={tools.exportGame}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
