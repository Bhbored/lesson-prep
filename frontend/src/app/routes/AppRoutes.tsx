import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/app/shell/AppShell";

const PreparePage = lazy(
  () => import("@/app/features/preparation/pages/PreparePage"),
);
const PresetsPage = lazy(
  () => import("@/app/features/presets/pages/PresetsPage"),
);
const SettingsPage = lazy(
  () => import("@/app/features/settings/pages/SettingsPage"),
);
const ResultsPage = lazy(
  () => import("@/app/features/results/pages/ResultsPage"),
);
const GuidePage = lazy(() => import("@/app/features/guide/pages/GuidePage"));
export function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className="page-content" role="status">
          Loading workspace…
        </div>
      }
    >
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/prepare" replace />} />
          <Route path="prepare" element={<PreparePage />} />
          <Route path="presets" element={<PresetsPage />} />
          <Route path="results" element={<ResultsPage />} />
          <Route path="guide" element={<GuidePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/prepare" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
