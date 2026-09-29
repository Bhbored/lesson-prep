import { NavLink } from "react-router-dom";
import {
  BookOpen,
  FilePenLine,
  FileText,
  Settings2,
} from "lucide-react";
import { useI18n } from "@/app/providers/i18n";
import { usePreparation } from "@/app/providers/preparation";

function Navigation({ mobile }: Readonly<{ mobile: boolean }>) {
  const t = useI18n(),
    { currentVariants } = usePreparation();
  return (
    <nav
      aria-label={t.mainNavigation}
      className={mobile
        ? "fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 gap-1 border-t border-line bg-paper px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:hidden"
        : "hidden gap-1 md:grid"}
    >
      {(
        [
          ["prepare", FilePenLine, t.prepare],
          ["presets", BookOpen, t.presets],
          ["results", FileText, t.results],
          ["settings", Settings2, t.settings],
        ] as const
      ).map(([id, Icon, label]) => (
        <NavLink
          key={id}
          to={`/${id}`}
          className={({ isActive }) => `nav-item relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-center text-[11px] font-semibold leading-tight transition-colors md:min-h-11 md:w-full md:flex-row md:justify-start md:gap-3 md:px-3 md:text-start md:text-sm ${isActive ? "active bg-leaf-100 text-leaf-800" : "text-muted hover:bg-leaf-50 hover:text-leaf-700"}`}
        >
          <Icon size={19} aria-hidden="true" />
          <span>{label}</span>
          {id === "results" && currentVariants.length > 0 && (
            <b className="absolute end-1 top-0 grid size-5 place-items-center rounded-md bg-leaf-100 text-[10px] text-leaf-700 md:static md:ms-auto">{currentVariants.length}</b>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export function MobileTabBar() {
  return <Navigation mobile />;
}

export function Sidebar() {
  const t = useI18n();
  return (
    <aside className="sidebar border-b border-line bg-paper px-4 py-3 md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:border-b-0 md:border-e md:py-7">
      <div className="brand flex items-center gap-3 md:mb-8 md:px-2">
        <div className="brand-mark grid size-10 shrink-0 place-items-center rounded-xl bg-leaf-700 text-white shadow-none">
          <BookOpen size={22} strokeWidth={2.3} aria-hidden="true" />
        </div>
        <div>
          <strong className="block font-display text-lg leading-tight text-ink">{t.app}</strong>
          <span className="hidden text-xs text-muted md:block">{t.subtitle}</span>
        </div>
      </div>
      <div className="nav-caption hidden px-3 pb-3 text-[11px] font-bold tracking-[0.12em] text-muted md:block">{t.workspace}</div>
      <Navigation mobile={false} />
    </aside>
  );
}
