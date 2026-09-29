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
  } = model;
  return (
    <div className="page-content">
      <div className="section-head">
        <div>
          <span className="eyebrow">{t.rhythmEyebrow}</span>
          <h1>{t.presets}</h1>
          <p>{t.presetsHelp}</p>
        </div>
        <button
          className="primary-button small"
          onClick={createPreset}
          disabled={!canCreatePreset}
        >
          <CirclePlus aria-hidden="true" size={18} />
          {t.newPreset}
        </button>
      </div>
      <div className="preset-layout">
        <div className="preset-list">
          {allPresets.map((preset) => (
            <button
              key={preset.id}
              className={`preset-list-item ${selectedPresetId === preset.id ? "current" : ""}`}
              onClick={() => {
                setSelectedPresetId(preset.id);
                setDraftPreset(null);
              }}
            >
              <div className="preset-list-icon">
                <BookOpen aria-hidden="true" size={19} />
              </div>
              <div>
                <strong>{preset.name}</strong>
                <span>
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
        <div className="panel preset-detail">
          {draftPreset ? (
            <>
              <div className="detail-head">
                <div>
                  <span className="eyebrow">{t.customFlow}</span>
                  <h2>{draftPreset.name || t.newPreset}</h2>
                </div>
                <button
                  className="icon-button"
                  aria-label={t.cancel}
                  onClick={() => setDraftPreset(null)}
                >
                  ×
                </button>
              </div>
              <div className="field-row">
                <label>
                  {t.name}
                  <input
                    value={draftPreset.name}
                    onChange={(event) =>
                      setDraftPreset({
                        ...draftPreset,
                        name: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  {t.description}
                  <input
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
              <div className="detail-actions">
                <span>
                  {t.total}:{" "}
                  {draftPreset.phases.reduce(
                    (sum, phase) => sum + Number(phase.durationMinutes || 0),
                    0,
                  )}{" "}
                  {t.minutes}
                </span>
                <button className="primary-button small" onClick={savePreset}>
                  <Check aria-hidden="true" size={17} />
                  {t.save}
                </button>
              </div>
            </>
          ) : selectedPreset ? (
            <>
              <div className="detail-head">
                <div>
                  <span className="eyebrow">
                    {selectedPreset.isDefault ? t.standard : t.local}
                  </span>
                  <h2>{selectedPreset.name}</h2>
                  <p>{selectedPreset.description}</p>
                </div>
                <div className="detail-buttons">
                  <button
                    className="secondary-button"
                    onClick={() => duplicate(selectedPreset)}
                  >
                    <Copy aria-hidden="true" size={16} />
                    {t.duplicate}
                  </button>
                  {!selectedPreset.isDefault && (
                    <>
                      <button
                        className="secondary-button"
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
                        className="icon-button danger"
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
              <div className="detail-phases">
                {selectedPreset.phases.map((phase, index) => (
                  <div className="detail-phase" key={index}>
                    <span className="phase-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <strong>{phase.name}</strong>
                    <span>
                      {phase.durationMinutes} {t.minutes}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flow-total">
                <span>{t.total}</span>
                <strong>
                  {selectedPreset.phases.reduce(
                    (sum, phase) => sum + Number(phase.durationMinutes),
                    0,
                  )}{" "}
                  {t.minutes}
                </strong>
              </div>
              {selectedPreset.isDefault && (
                <p className="subtle-info">{t.readOnly}</p>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
