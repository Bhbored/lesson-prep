import { useLocation } from "react-router-dom";
import { useI18n } from "@/app/providers/i18n";
import { useSettings } from "@/app/providers/settings";
import { logos } from "@/app/shared/data/workspace";
import { providerNames } from "@/app/shared/data/providers";

export function Topbar() {
  const t = useI18n(),
    { settings } = useSettings(),
    { pathname } = useLocation();
  const labels: Record<string, string> = {
    "/prepare": t.prepare,
    "/presets": t.presets,
    "/results": t.results,
    "/settings": t.settings,
  };
  return (
    <header className="topbar">
      <span>{labels[pathname]}</span>
      <div className="topbar-right">
        <span className="provider-pill">
          <img src={logos[settings.provider]} width={18} height={18} alt="" />
          {providerNames[settings.provider]}
        </span>
        <span className="avatar">T</span>
      </div>
    </header>
  );
}
