import { Check, KeyRound, RefreshCw, Sparkles } from "lucide-react";
import type { useSettingsPage } from "@/app/features/settings/hooks/useSettingsPage";
interface ProviderSettingsProps {
  readonly model: Pick<
    ReturnType<typeof useSettingsPage>,
    | "settings"
    | "updateSettings"
    | "setError"
    | "setNotice"
    | "t"
    | "keyInput"
    | "setKeyInput"
    | "models"
    | "modelLoading"
    | "keySaving"
    | "saveKey"
    | "refreshModels"
    | "removeKey"
    | "logos"
    | "providerIds"
    | "providerNames"
  >;
}
export function ProviderSettings({ model }: Readonly<ProviderSettingsProps>) {
  const {
    settings,
    updateSettings,
    setError,
    setNotice,
    t,
    keyInput,
    setKeyInput,
    models,
    modelLoading,
    keySaving,
    saveKey,
    refreshModels,
    removeKey,
    logos,
    providerIds,
    providerNames,
  } = model;
  return (
    <>
      <section className="panel settings-panel">
        <div className="panel-heading">
          <div className="panel-icon mint">
            <Sparkles aria-hidden="true" size={20} />
          </div>
          <div>
            <h3>{t.aiProvider}</h3>
            <p>{t.providerHelp}</p>
          </div>
        </div>
        <div className="provider-grid">
          {providerIds.map((id) => (
            <button
              className={`provider-card ${settings.provider === id ? "selected" : ""}`}
              key={id}
              onClick={() => {
                updateSettings({ ...settings, provider: id });
                setError("");
                setNotice("");
              }}
            >
              <img src={logos[id]} width={28} height={28} alt="" />
              <strong>{providerNames[id]}</strong>
              {settings.keys[id] && (
                <Check
                  aria-hidden="true"
                  size={15}
                  className="provider-check"
                />
              )}
            </button>
          ))}
        </div>
        <div className="key-section">
          <div>
            <label className="field-label">
              {providerNames[settings.provider]} {t.apiKey}
              <div className="key-input-wrap">
                <KeyRound aria-hidden="true" size={17} />
                <input
                  type="password"
                  name="apiKey"
                  spellCheck={false}
                  autoComplete="off"
                  value={keyInput}
                  onChange={(event) => setKeyInput(event.target.value)}
                  placeholder={t.pasteKey}
                />
              </div>
            </label>
            <p className="subtle-info">{t.security}</p>
          </div>
          <div className="key-actions">
            <button
              className="primary-button small"
              disabled={!keyInput.trim() || keySaving}
              onClick={saveKey}
            >
              <KeyRound aria-hidden="true" size={16} />
              {t.saveKey}
            </button>
            {settings.keys[settings.provider] && (
              <button className="text-button danger" onClick={removeKey}>
                {t.removeKey}
              </button>
            )}
          </div>
        </div>
        {settings.keys[settings.provider] && (
          <div className="model-section">
            <div className="model-title">
              <label htmlFor="model-select">{t.model}</label>
              <button
                className="text-button"
                onClick={refreshModels}
                disabled={modelLoading}
              >
                <RefreshCw
                  aria-hidden="true"
                  size={15}
                  className={modelLoading ? "spin" : ""}
                />
                {t.refreshModels}
              </button>
            </div>
            <select
              id="model-select"
              name="model"
              value={settings.models[settings.provider] || ""}
              onChange={(event) =>
                updateSettings({
                  ...settings,
                  models: {
                    ...settings.models,
                    [settings.provider]: event.target.value,
                  },
                })
              }
            >
              <option value="">
                {modelLoading ? t.loading : t.selectModel}
              </option>
              {models.map((model) => (
                <option value={model.id} key={model.id}>
                  {model.name} ({model.id})
                </option>
              ))}
            </select>
            <p className="subtle-info">
              {models.length} {t.modelsAvailable}
            </p>
          </div>
        )}
      </section>
    </>
  );
}
