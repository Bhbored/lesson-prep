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
    <header className="topbar border-line flex h-[72px] items-center justify-between border-b text-sm text-muted">
      <span>{labels[pathname]}</span>
      <div className="topbar-right flex items-center gap-2">
        <span className="provider-pill flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-xs font-semibold text-ink">
          <img className="size-[18px] object-contain" src={logos[settings.provider]} width={18} height={18} alt="" />
          {providerNames[settings.provider]}
        </span>
      </div>
    </header>
  );
}
