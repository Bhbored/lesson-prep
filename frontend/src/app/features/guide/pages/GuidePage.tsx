import { CircleHelp } from "lucide-react";
import { providerIds } from "@/app/shared/data/providers";
import { providerNames } from "@/app/shared/data/providers";
import { useI18n } from "@/app/providers/i18n";
import { ProviderGuideSection } from "../components/ProviderGuideSection";

export default function GuidePage() {
  const t = useI18n();

  return (
    <div className="page-content pt-8">
      <div className="section-head mb-6 max-w-5xl">
        <span className="eyebrow text-[11px] font-bold tracking-[0.14em] text-leaf-700 uppercase">
          {t.guideEyebrow}
        </span>
        <h1 className="mt-2 flex flex-wrap items-center gap-3 font-display text-3xl font-semibold tracking-tight">
          <span className="grid size-10 place-items-center rounded-xl bg-leaf-100 text-leaf-700">
            <CircleHelp size={22} aria-hidden="true" />
          </span>
          {t.guideTitle}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          {t.guideHelp}
        </p>
      </div>

      <nav
        aria-label={t.guideJumpLabel}
        className="mb-8 flex max-w-5xl flex-wrap gap-2"
      >
        {providerIds.map((id) => (
          <a
            key={id}
            className="inline-flex min-h-11 items-center rounded-lg border border-line bg-paper px-4 text-sm font-semibold text-ink hover:border-leaf-300 hover:bg-leaf-50"
            href={`#guide-${id}`}
          >
            {providerNames[id]}
          </a>
        ))}
      </nav>

      {providerIds.map((id) => (
        <ProviderGuideSection key={id} provider={id} />
      ))}
    </div>
  );
}
