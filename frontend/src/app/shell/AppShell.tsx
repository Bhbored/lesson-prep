import { Outlet } from "react-router-dom";
import { MobileTabBar, Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { Alerts } from "./components/Alerts";
import { useI18n } from "@/app/providers/i18n";

export function AppShell() {
  const t = useI18n();
  return (
    <div className="app-shell min-h-screen bg-canvas text-ink md:flex">
      <a className="absolute start-2 top-2 z-[100] -translate-y-[200%] rounded-lg bg-white p-3 text-leaf-800 shadow-md focus-visible:translate-y-0" href="#main-content">
        {t.skipToContent}
      </a>
      <Sidebar />
      <main className="main-content mx-auto min-w-0 max-w-[1500px] flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 md:pb-12 xl:px-12" id="main-content" tabIndex={-1}>
        <Topbar />
        <Alerts />
        <Outlet />
      </main>
      <MobileTabBar />
    </div>
  );
}
