import { ProviderSettings } from "../components/ProviderSettings";
import { Settings2 } from "lucide-react";
import { useSettingsPage } from "@/app/features/settings/hooks/useSettingsPage";
export default function SettingsPage() {
  const model = useSettingsPage();
  const { settings, updateSettings, t } = model;
  return (
    <div className="page-content">
      <div className="section-head">
        <div>
          <span className="eyebrow">{t.settingsEyebrow}</span>
          <h1>{t.settings}</h1>
          <p>{t.settingsHelp}</p>
        </div>
      </div>
      <section className="panel settings-panel">
        <div className="panel-heading">
          <div className="panel-icon lavender">
            <Settings2 aria-hidden="true" size={20} />
          </div>
          <div>
            <h3>{t.displayLanguage}</h3>
            <p>{t.displayHelp}</p>
          </div>
        </div>
        <div className="segmented language-segment">
          <button
            className={settings.displayLanguage === "en" ? "selected" : ""}
            onClick={() =>
              updateSettings({ ...settings, displayLanguage: "en" })
            }
          >
            English
          </button>
          <button
            className={settings.displayLanguage === "ar" ? "selected" : ""}
            onClick={() =>
              updateSettings({ ...settings, displayLanguage: "ar" })
            }
          >
            العربية
          </button>
        </div>
      </section>
      <ProviderSettings model={model} />
    </div>
  );
}
