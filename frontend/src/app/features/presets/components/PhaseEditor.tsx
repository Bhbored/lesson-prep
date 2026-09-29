import { ArrowDown, ArrowUp, CirclePlus, Trash2 } from "lucide-react";
import type { usePresetsPage } from "@/app/features/presets/hooks/usePresetsPage";
interface PhaseEditorProps {
  readonly model: Pick<
    ReturnType<typeof usePresetsPage>,
    "t" | "draftPreset" | "setDraftPreset" | "editPhase" | "movePhase"
  >;
}
export function PhaseEditor({ model }: Readonly<PhaseEditorProps>) {
  const { t, draftPreset, setDraftPreset, editPhase, movePhase } = model;
  if (!draftPreset) return null;
  return (
    <>
      <div className="edit-phase-list my-5 grid gap-2">
        {draftPreset.phases.map((phase, index) => (
          <div className="edit-phase flex flex-wrap items-center gap-2 rounded-lg border border-line p-3" key={index}>
            <span className="phase-index grid size-6 shrink-0 place-items-center rounded-md bg-leaf-100 text-[10px] font-extrabold text-leaf-700">
              {String(index + 1).padStart(2, "0")}
            </span>
            <input
              className="min-h-11 min-w-32 flex-1 rounded-lg border border-[#7a9982] bg-white px-3 py-2 text-sm text-ink"
              aria-label={t.phaseName}
              placeholder={t.phaseName}
              value={phase.name}
              onChange={(event) =>
                editPhase(index, { name: event.target.value })
              }
            />
            <input
              className="min-h-11 w-16 rounded-lg border border-[#7a9982] bg-white px-2 py-2 text-sm text-ink"
              aria-label={t.duration}
              type="number"
              min="1"
              value={phase.durationMinutes}
              onChange={(event) =>
                editPhase(index, {
                  durationMinutes: Number(event.target.value),
                })
              }
            />
            <span className="text-xs text-muted">{t.minutes}</span>
            <button
              className="icon-button grid min-h-11 min-w-11 place-items-center rounded-lg bg-leaf-50 text-leaf-700"
              aria-label={t.moveUp}
              onClick={() => movePhase(index, -1)}
            >
              <ArrowUp aria-hidden="true" size={16} />
            </button>
            <button
              className="icon-button grid min-h-11 min-w-11 place-items-center rounded-lg bg-leaf-50 text-leaf-700"
              aria-label={t.moveDown}
              onClick={() => movePhase(index, 1)}
            >
              <ArrowDown aria-hidden="true" size={16} />
            </button>
            <button
              className="icon-button danger grid min-h-11 min-w-11 place-items-center rounded-lg bg-red-50 text-red-700"
              aria-label={t.remove}
              onClick={() =>
                setDraftPreset({
                  ...draftPreset,
                  phases: draftPreset.phases.filter((_, i) => i !== index),
                })
              }
            >
              <Trash2 aria-hidden="true" size={16} />
            </button>
          </div>
        ))}
      </div>
      <button
        className="secondary-button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-leaf-800 hover:bg-leaf-50"
        disabled={draftPreset.phases.length >= 12}
        onClick={() =>
          setDraftPreset({
            ...draftPreset,
            phases: [
              ...draftPreset.phases,
              {
                name: "",
                durationMinutes: 5,
                order: draftPreset.phases.length + 1,
              },
            ],
          })
        }
      >
        <CirclePlus aria-hidden="true" size={16} />
        {t.addPhase}
      </button>
    </>
  );
}
