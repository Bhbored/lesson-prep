import { Link } from "react-router-dom";
import { Check, KeyRound, RefreshCw, Server } from "lucide-react";
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
      <section className="panel settings-panel mb-5 max-w-4xl rounded-xl border border-line bg-paper p-5 sm:p-6">
        <div className="panel-heading mb-5 flex items-center gap-3">
          <div className="panel-icon mint grid size-10 shrink-0 place-items-center rounded-xl bg-leaf-100 text-leaf-700">
            <Server aria-hidden="true" size={20} />
          </div>
          <div>
            <h3 className="font-semibold">{t.aiProvider}</h3>
            <p className="mt-0.5 text-xs text-muted">{t.providerHelp}</p>
            <Link
              className="mt-2 inline-flex min-h-11 items-center text-xs font-bold text-leaf-700 hover:underline"
              to="/guide"
            >
              {t.guideFromSettings}
            </Link>
          </div>
        </div>
        <div className="provider-grid grid grid-cols-2 gap-3 sm:grid-cols-4">
          {providerIds.map((id) => (
            <button
              className={`provider-card relative flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border bg-white p-3 transition-colors ${settings.provider === id ? "selected border-leaf-500 bg-leaf-50 text-leaf-800" : "border-line text-ink hover:border-leaf-500 hover:bg-leaf-50"}`}
              key={id}
              onClick={() => {
                updateSettings({ ...settings, provider: id });
                setError("");
                setNotice("");
              }}
            >
              <img
                className="size-7 object-contain"
                src={logos[id]}
                width={28}
                height={28}
                alt=""
              />
              <strong className="text-xs">{providerNames[id]}</strong>
              {settings.keys[id] && (
                <Check
                  aria-hidden="true"
                  size={15}
                  className="provider-check absolute inset-e-2 top-2 text-leaf-700"
                />
              )}
            </button>
          ))}
        </div>
        <div className="key-section mt-6 grid grid-cols-1 gap-4 border-t border-line pt-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <label className="field-label block text-xs font-semibold text-muted">
              {providerNames[settings.provider]} {t.apiKey}
              <div className="key-input-wrap relative mt-2">
                <KeyRound
                  className="absolute inset-s-3 top-1/2 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                  size={17}
                />
                <input
                  className="block min-h-11 w-full max-w-lg rounded-lg border border-[#7a9982] bg-white py-2 pe-3 ps-10 text-sm text-ink focus-visible:border-leaf-600"
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
            <p className="subtle-info mt-3 text-xs text-muted">{t.security}</p>
          </div>
          <div className="key-actions flex flex-wrap items-center gap-2">
            <button
              className="primary-button small inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-leaf-700 px-4 py-2 text-sm font-semibold text-white hover:bg-leaf-800"
              disabled={!keyInput.trim() || keySaving}
              onClick={saveKey}
            >
              <KeyRound aria-hidden="true" size={16} />
              {t.saveKey}
            </button>
            {settings.keys[settings.provider] && (
              <button
                className="text-button danger min-h-11 px-2 font-semibold text-red-700"
                onClick={removeKey}
              >
                {t.removeKey}
              </button>
            )}
          </div>
        </div>
        {settings.keys[settings.provider] && (
          <div className="model-section mt-6 border-t border-line pt-5">
            <div className="model-title flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
              <label htmlFor="model-select">{t.model}</label>
              <button
                className="text-button inline-flex min-h-11 items-center gap-1 text-xs font-bold text-leaf-700 hover:underline"
                onClick={refreshModels}
                disabled={modelLoading}
              >
                <RefreshCw
                  aria-hidden="true"
                  size={15}
                  className={modelLoading ? "animate-spin" : ""}
                />
                {t.refreshModels}
              </button>
            </div>
            <select
              className="mt-2 block min-h-11 w-full max-w-xl rounded-lg border border-[#7a9982] bg-white px-3 py-2 text-sm text-ink"
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
            <p className="subtle-info mt-3 text-xs text-muted">
              {models.length} {t.modelsAvailable}
            </p>
          </div>
        )}
      </section>
    </>
  );
}
