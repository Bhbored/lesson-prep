import { Outlet } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { Alerts } from "./components/Alerts";

export function AppShell() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Sidebar />
      <main className="main-content" id="main-content" tabIndex={-1}>
        <Topbar />
        <Alerts />
        <Outlet />
      </main>
    </div>
  );
}
