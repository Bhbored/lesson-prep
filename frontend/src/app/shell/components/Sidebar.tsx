import { NavLink } from "react-router-dom";
import {
  BookOpen,
  WandSparkles,
  FileText,
  Settings2,
  Sparkles,
} from "lucide-react";
import { useI18n } from "@/app/providers/i18n";
import { usePreparation } from "@/app/providers/preparation";

export function Sidebar() {
  const t = useI18n(),
    { currentVariants } = usePreparation();
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <BookOpen size={22} strokeWidth={2.3} aria-hidden="true" />
        </div>
        <div>
          <strong>{t.app}</strong>
          <span>{t.subtitle}</span>
        </div>
      </div>
      <div className="nav-caption">{t.workspace}</div>
      <nav aria-label="Main navigation">
        {(
          [
            ["prepare", WandSparkles, t.prepare],
            ["presets", BookOpen, t.presets],
            ["results", FileText, t.results],
            ["settings", Settings2, t.settings],
          ] as const
        ).map(([id, Icon, label]) => (
          <NavLink
            key={id}
            to={`/${id}`}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <Icon size={19} aria-hidden="true" />
            <span>{label}</span>
            {id === "results" && currentVariants.length > 0 && (
              <b>{currentVariants.length}</b>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="footer-spark">
          <Sparkles size={18} aria-hidden="true" />
        </div>
        <p>{t.sidebarFooter}</p>
      </div>
    </aside>
  );
}
