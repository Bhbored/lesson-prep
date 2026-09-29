import { Link } from "react-router-dom";
import type { ProviderId } from "@/app/shared/schemas/domain";
import { logos } from "@/app/shared/data/workspace";
import { providerNames } from "@/app/shared/data/providers";
import { useI18n } from "@/app/providers/i18n";
import {
  bodyKeyForStep,
  guideStepOrder,
  providerGuideLinks,
} from "../data/providerGuides";
import { GuideStep } from "./GuideStep";
import { KeySaveWarning } from "./KeySaveWarning";

interface ProviderGuideSectionProps {
  readonly provider: ProviderId;
}

export function ProviderGuideSection({
  provider,
}: Readonly<ProviderGuideSectionProps>) {
  const t = useI18n();
  const links = providerGuideLinks[provider];
  const name = providerNames[provider];

  return (
    <section
      id={`guide-${provider}`}
      className="panel guide-provider scroll-mt-24 mb-6 max-w-5xl rounded-xl border border-line bg-paper p-5 sm:p-6"
      aria-labelledby={`guide-heading-${provider}`}
    >
      <header className="mb-5 flex flex-wrap items-center gap-3">
        <img
          className="size-9 object-contain"
          src={logos[provider]}
          width={36}
          height={36}
          alt=""
        />
        <div className="min-w-0">
          <h2
            id={`guide-heading-${provider}`}
            className="font-display text-2xl font-semibold tracking-tight"
          >
            {name}
          </h2>
          <p className="mt-0.5 text-xs text-muted">{t.guideProviderLead}</p>
        </div>
      </header>

      <div className="space-y-8">
        {guideStepOrder.map((step, index) => {
          const href = links[step.urlField];
          const bodyKey = bodyKeyForStep(links, step.id);
          return (
            <GuideStep
              key={step.id}
              stepNumber={index + 1}
              title={t[step.titleKey]}
              body={t[bodyKey]}
              href={href}
              openLabel={t.guideOpenLink}
              imageSrc={links.images[step.id]}
              imageAlt={`${name} — ${t[step.titleKey]}`}
              pendingLabel={t.guideScreenshotPending}
            />
          );
        })}
      </div>

      <div className="mt-6 space-y-3">
        <KeySaveWarning title={t.guideKeyWarningTitle} body={t.guideKeyWarning} />
        <p className="text-xs leading-relaxed text-muted">{t.guideNoStore}</p>
        <Link
          className="inline-flex min-h-11 items-center text-sm font-semibold text-leaf-700 hover:underline"
          to="/settings"
        >
          {t.guideGoSettings}
        </Link>
      </div>
    </section>
  );
}
