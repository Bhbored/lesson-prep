import { Link } from "react-router-dom";
import {
  ClipboardList,
  Gamepad2,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import type { SessionTool } from "@/app/shared/schemas/domain";
import { useI18n } from "@/app/providers/i18n";

interface SessionToolsGuidePanelProps {
  readonly tool: SessionTool;
}

const toolMeta: Record<
  SessionTool,
  { icon: LucideIcon; leadKey: "guideWorksheetLead" | "guideQuizLead" | "guideGameLead"; bodyKey: "guideWorksheetBody" | "guideQuizBody" | "guideGameBody" }
> = {
  worksheet: {
    icon: ClipboardList,
    leadKey: "guideWorksheetLead",
    bodyKey: "guideWorksheetBody",
  },
  quiz: {
    icon: ListChecks,
    leadKey: "guideQuizLead",
    bodyKey: "guideQuizBody",
  },
  game: {
    icon: Gamepad2,
    leadKey: "guideGameLead",
    bodyKey: "guideGameBody",
  },
};

export function SessionToolsGuidePanel({
  tool,
}: Readonly<SessionToolsGuidePanelProps>) {
  const t = useI18n();
  const meta = toolMeta[tool];
  const Icon = meta.icon;
  const title =
    tool === "worksheet" ? t.worksheet : tool === "quiz" ? t.quiz : t.game;

  return (
    <section
      className="panel rounded-xl border border-line bg-paper p-5 sm:p-6"
      aria-labelledby={`guide-tool-heading-${tool}`}
    >
      <header className="mb-5 flex flex-wrap items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-leaf-100 text-leaf-700">
          <Icon size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2
            id={`guide-tool-heading-${tool}`}
            className="font-display text-2xl font-semibold tracking-tight"
          >
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-muted">{t[meta.leadKey]}</p>
        </div>
      </header>

      <p className="text-sm leading-relaxed text-ink">{t[meta.bodyKey]}</p>

      <div className="mt-6 border-t border-line pt-5">
        <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
          {t.guideToolsHowTitle}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {t.guideToolsHowBody}
        </p>
        <Link
          className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-leaf-700 hover:underline"
          to="/results"
        >
          {t.guideGoResults}
        </Link>
      </div>
    </section>
  );
}
