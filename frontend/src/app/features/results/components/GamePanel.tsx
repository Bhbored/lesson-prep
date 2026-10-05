import { Download } from "lucide-react";
import type { Game } from "@/app/shared/schemas/domain";
import type { useI18n } from "@/app/providers/i18n";

interface GamePanelProps {
  readonly game: Game;
  readonly t: ReturnType<typeof useI18n>;
  readonly onDownload: () => void;
}

export function GamePanel({ game, t, onDownload }: Readonly<GamePanelProps>) {
  const questions = game.quiz?.questions ?? [];
  const pairs = game.matching?.pairs ?? [];

  return (
    <section className="game-panel mt-4 rounded-xl border border-line bg-paper p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="eyebrow text-[11px] font-bold tracking-[0.14em] text-leaf-700 uppercase">
            {t.game}
          </span>
          <h3 className="mt-1 font-display text-2xl font-semibold">
            {game.title}
          </h3>
        </div>
        <button
          type="button"
          className="secondary-button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-leaf-800 hover:bg-leaf-50"
          onClick={onDownload}
        >
          <Download aria-hidden="true" size={16} />
          {t.downloadGame}
        </button>
      </div>
      {game.kind === "quiz" ? (
        <ol className="space-y-3">
          {questions.map((question, index) => (
            <li key={`${question.prompt}-${index}`}>
              <p className="font-semibold">
                {t.question} {index + 1}. {question.prompt}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-muted">
                {question.options.map((option) => (
                  <li key={option}>{option}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="space-y-2 text-sm">
          {pairs.map((pair) => (
            <li
              key={`${pair.left}-${pair.right}`}
              className="rounded-lg bg-leaf-50 px-3 py-2"
            >
              {pair.left} — {pair.right}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
