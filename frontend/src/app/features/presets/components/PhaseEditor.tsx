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
      <div className="edit-phase-list">
        {draftPreset.phases.map((phase, index) => (
          <div className="edit-phase" key={index}>
            <span className="phase-index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <input
              aria-label={t.phaseName}
              placeholder={t.phaseName}
              value={phase.name}
              onChange={(event) =>
                editPhase(index, { name: event.target.value })
              }
            />
            <input
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
            <span>{t.minutes}</span>
            <button
              className="icon-button"
              aria-label={t.moveUp}
              onClick={() => movePhase(index, -1)}
            >
              <ArrowUp aria-hidden="true" size={16} />
            </button>
            <button
              className="icon-button"
              aria-label={t.moveDown}
              onClick={() => movePhase(index, 1)}
            >
              <ArrowDown aria-hidden="true" size={16} />
            </button>
            <button
              className="icon-button danger"
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
        className="secondary-button"
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
