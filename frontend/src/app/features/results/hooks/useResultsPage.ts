import { useNavigate } from "react-router-dom";
import { usePreparation } from "@/app/providers/preparation";
import { useSettings } from "@/app/providers/settings";
import { useI18n } from "@/app/providers/i18n";
import { providerNames } from "@/app/shared/data/providers";
import { usePrintLesson } from "./usePrintLesson";

export function useResultsPage() {
  const state = usePreparation(),
    navigate = useNavigate();
  const exportSelectedPdf = usePrintLesson(state.activeVariant?.lesson.title);
  return {
    ...state,
    ...useSettings(),
    t: useI18n(),
    providerNames,
    exportSelectedPdf,
    setTab: (tab: string) => navigate(`/${tab}`),
  };
}
