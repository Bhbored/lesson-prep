import { PhaseEditor } from "../components/PhaseEditor";
import {
  BookOpen,
  Check,
  ChevronRight,
  CirclePlus,
  Copy,
  Trash2,
} from "lucide-react";
import { usePresetsPage } from "@/app/features/presets/hooks/usePresetsPage";
import { displayedPhaseName } from "@/app/features/presets/standardFlow";
export default function PresetsPage() {
  const model = usePresetsPage();
  const {
    selectedPresetId,
    t,
    setSelectedPresetId,
    allPresets,
    selectedPreset,
    draftPreset,
    setDraftPreset,
    localPresets,
    serverPresets,
    updateLocalPresets,
    duplicate,
    savePreset,
    createPreset,
    canCreatePreset,
    displayLanguage,
  } = model;
  return (
    <div className="page-content pt-8">
      <div className="section-head mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow text-[11px] font-bold tracking-[0.14em] text-leaf-700 uppercase">{t.rhythmEyebrow}</span>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{t.presets}</h1>
          <p className="mt-1 text-sm text-muted">{t.presetsHelp}</p>
        </div>
        <button
          className="primary-button small inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-leaf-700 px-4 py-2 text-sm font-semibold text-white hover:bg-leaf-800"
          onClick={createPreset}
          disabled={!canCreatePreset}
        >
          <CirclePlus aria-hidden="true" size={18} />
          {t.newPreset}
        </button>
      </div>
      <div className="preset-layout grid grid-cols-1 gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <div className="preset-list grid content-start gap-2">
          {allPresets.map((preset) => (
            <button
              key={preset.id}
              className={`preset-list-item flex min-h-16 items-center gap-3 rounded-lg border p-3 text-start transition-colors ${selectedPresetId === preset.id ? "current border-leaf-500 bg-leaf-50 text-leaf-800" : "border-line bg-white text-ink hover:border-leaf-500"}`}
              onClick={() => {
                setSelectedPresetId(preset.id);
                setDraftPreset(null);
              }}
            >
              <div className="preset-list-icon grid size-9 shrink-0 place-items-center rounded-lg bg-leaf-100 text-leaf-700">
                <BookOpen aria-hidden="true" size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-xs">{preset.name}</strong>
                <span className="text-xs text-muted">
                  {preset.isDefault ? t.standard : t.local} ·{" "}
                  {preset.phases.reduce(
                    (sum, phase) => sum + Number(phase.durationMinutes),
                    0,
                  )}{" "}
                  {t.minutes}
                </span>
              </div>
              <ChevronRight aria-hidden="true" size={17} />
            </button>
          ))}
        </div>
        <div className="panel preset-detail min-h-80 min-w-0 rounded-xl border border-line bg-paper p-5 sm:p-6">
          {draftPreset ? (
            <>
              <div className="detail-head mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="eyebrow text-[11px] font-bold tracking-[0.14em] text-leaf-700 uppercase">{t.customFlow}</span>
                  <h2 className="mt-2 font-display text-2xl font-semibold">{draftPreset.name || t.newPreset}</h2>
                </div>
                <button
                  className="icon-button grid min-h-11 min-w-11 place-items-center rounded-lg bg-leaf-50 text-leaf-700"
                  aria-label={t.cancel}
                  onClick={() => setDraftPreset(null)}
                >
                  ×
                </button>
              </div>
              <div className="field-row grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
                <label className="block text-xs font-semibold text-muted">
                  {t.name}
                  <input
                    className="mt-2 block min-h-11 w-full rounded-lg border border-[#7a9982] bg-white px-3 py-2 text-sm text-ink"
                    value={draftPreset.name}
                    onChange={(event) =>
                      setDraftPreset({
                        ...draftPreset,
                        name: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="block text-xs font-semibold text-muted">
                  {t.description}
                  <input
                    className="mt-2 block min-h-11 w-full rounded-lg border border-[#7a9982] bg-white px-3 py-2 text-sm text-ink"
                    value={draftPreset.description}
                    onChange={(event) =>
                      setDraftPreset({
                        ...draftPreset,
                        description: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
              <PhaseEditor model={model} />
              <div className="detail-actions mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-xs text-muted">
                <span>
                  {t.total}:{" "}
                  {draftPreset.phases.reduce(
                    (sum, phase) => sum + Number(phase.durationMinutes || 0),
                    0,
                  )}{" "}
                  {t.minutes}
                </span>
                <button className="primary-button small inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-leaf-700 px-4 py-2 text-sm font-semibold text-white hover:bg-leaf-800" onClick={savePreset}>
                  <Check aria-hidden="true" size={17} />
                  {t.save}
                </button>
              </div>
            </>
          ) : selectedPreset ? (
            <>
              <div className="detail-head mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="eyebrow text-[11px] font-bold tracking-[0.14em] text-leaf-700 uppercase">
                    {selectedPreset.isDefault ? t.standard : t.local}
                  </span>
                  <h2 className="mt-2 font-display text-2xl font-semibold">{selectedPreset.name}</h2>
                  <p className="mt-1 text-xs text-muted">{selectedPreset.description}</p>
                </div>
                <div className="detail-buttons flex flex-wrap gap-2">
                  <button
                    className="secondary-button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-leaf-800 hover:bg-leaf-50"
                    onClick={() => duplicate(selectedPreset)}
                  >
                    <Copy aria-hidden="true" size={16} />
                    {t.duplicate}
                  </button>
                  {!selectedPreset.isDefault && (
                    <>
                      <button
                        className="secondary-button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-leaf-800 hover:bg-leaf-50"
                        onClick={() =>
                          setDraftPreset({
                            ...selectedPreset,
                            phases: selectedPreset.phases.map((x) => ({
                              ...x,
                            })),
                          })
                        }
                      >
                        {t.edit}
                      </button>
                      <button
                        className="icon-button danger grid min-h-11 min-w-11 place-items-center rounded-lg bg-red-50 text-red-700"
                        aria-label={t.remove}
                        onClick={() => {
                          updateLocalPresets(
                            localPresets.filter(
                              (x) => x.id !== selectedPreset.id,
                            ),
                          );
                          setSelectedPresetId(serverPresets[0]?.id || "");
                        }}
                      >
                        <Trash2 aria-hidden="true" size={17} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="detail-phases grid gap-2">
                {selectedPreset.phases.map((phase, index) => (
                  <div className="detail-phase flex items-center gap-3 rounded-lg border border-line p-3" key={index}>
                    <span className="phase-index grid size-6 shrink-0 place-items-center rounded-md bg-leaf-100 text-[10px] font-extrabold text-leaf-700">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <strong className="min-w-0 flex-1 break-words text-sm">{displayedPhaseName(selectedPreset, phase, displayLanguage)}</strong>
                    <span className="shrink-0 text-xs text-muted">
                      {phase.durationMinutes} {t.minutes}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flow-total mt-5 flex justify-between gap-3 border-t border-line pt-4 text-xs text-muted">
                <span>{t.total}</span>
                <strong className="text-leaf-700">
                  {selectedPreset.phases.reduce(
                    (sum, phase) => sum + Number(phase.durationMinutes),
                    0,
                  )}{" "}
                  {t.minutes}
                </strong>
              </div>
              {selectedPreset.isDefault && (
                <p className="subtle-info mt-3 text-xs text-muted">{t.readOnly}</p>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
