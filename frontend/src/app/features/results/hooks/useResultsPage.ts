import { useNavigate } from "react-router-dom";
import { usePreparation } from "@/app/providers/preparation";
import { useSettings } from "@/app/providers/settings";
import { useI18n } from "@/app/providers/i18n";
import { providerNames } from "@/app/shared/data/providers";
import { useDownloadLesson } from "./useDownloadLesson";
import { useAlerts } from "@/app/providers/alerts";

export function useResultsPage() {
  const state = usePreparation(),
    navigate = useNavigate();
  const t = useI18n();
  const { setError } = useAlerts();
  const { download: exportSelectedPdf, downloading } = useDownloadLesson(
    state.activeVariant?.variantNumber,
    () => setError(t.pdfFailed),
  );
  return {
    ...state,
    ...useSettings(),
    t,
    downloading,
    providerNames,
    exportSelectedPdf,
    setTab: (tab: string) => navigate(`/${tab}`),
  };
}
