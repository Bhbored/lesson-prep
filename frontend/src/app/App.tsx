import { BrowserRouter } from "react-router-dom";
import { QueryProvider } from "./providers/QueryProvider";
import { AlertsProvider } from "./providers/AlertsProvider";
import { SettingsProvider } from "./providers/SettingsProvider";
import { I18nProvider } from "./providers/I18nProvider";
import { PresetsProvider } from "./providers/PresetsProvider";
import { PreparationProvider } from "./providers/PreparationProvider";
import { AppRoutes } from "./routes/AppRoutes";

export default function App() {
  return (
    <BrowserRouter>
      <QueryProvider>
        <AlertsProvider>
          <SettingsProvider>
            <I18nProvider>
              <PresetsProvider>
                <PreparationProvider>
                  <AppRoutes />
                </PreparationProvider>
              </PresetsProvider>
            </I18nProvider>
          </SettingsProvider>
        </AlertsProvider>
      </QueryProvider>
    </BrowserRouter>
  );
}
