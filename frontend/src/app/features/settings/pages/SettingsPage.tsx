import { ProviderSettings } from "../components/ProviderSettings";
import { Settings2 } from "lucide-react";
import { useSettingsPage } from "@/app/features/settings/hooks/useSettingsPage";
export default function SettingsPage() {
  const model = useSettingsPage();
  const { settings, updateSettings, t } = model;
  return (
    <div className="page-content pt-8">
      <div className="section-head mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow text-[11px] font-bold tracking-[0.14em] text-leaf-700 uppercase">{t.settingsEyebrow}</span>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{t.settings}</h1>
          <p className="mt-1 text-sm text-muted">{t.settingsHelp}</p>
        </div>
      </div>
      <section className="panel settings-panel mb-5 max-w-4xl rounded-xl border border-line bg-paper p-5 sm:p-6">
        <div className="panel-heading mb-5 flex items-center gap-3">
          <div className="panel-icon lavender grid size-10 shrink-0 place-items-center rounded-xl bg-leaf-100 text-leaf-700">
            <Settings2 aria-hidden="true" size={20} />
          </div>
          <div>
            <h3 className="font-semibold">{t.displayLanguage}</h3>
            <p className="mt-0.5 text-xs text-muted">{t.displayHelp}</p>
          </div>
        </div>
        <div className="segmented language-segment flex flex-wrap gap-2">
          <button
            className={`min-h-11 rounded-lg border px-5 font-semibold ${settings.displayLanguage === "en" ? "selected border-leaf-300 bg-leaf-100 text-leaf-800" : "border-line bg-white text-muted"}`}
            onClick={() =>
              updateSettings({ ...settings, displayLanguage: "en" })
            }
          >
            {t.english}
          </button>
          <button
            className={`min-h-11 rounded-lg border px-5 font-semibold ${settings.displayLanguage === "ar" ? "selected border-leaf-300 bg-leaf-100 text-leaf-800" : "border-line bg-white text-muted"}`}
            onClick={() =>
              updateSettings({ ...settings, displayLanguage: "ar" })
            }
          >
            {t.arabic}
          </button>
          <button
            className={`min-h-11 rounded-lg border px-5 font-semibold ${settings.displayLanguage === "fr" ? "selected border-leaf-300 bg-leaf-100 text-leaf-800" : "border-line bg-white text-muted"}`}
            onClick={() =>
              updateSettings({ ...settings, displayLanguage: "fr" })
            }
          >
            {t.french}
          </button>
        </div>
      </section>
      <ProviderSettings model={model} />
    </div>
  );
}
