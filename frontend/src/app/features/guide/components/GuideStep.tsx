import { ExternalLink } from "lucide-react";

interface GuideStepProps {
  readonly stepNumber: number;
  readonly title: string;
  readonly body: string;
  readonly href: string;
  readonly openLabel: string;
  readonly imageSrc?: string;
  readonly imageAlt: string;
  readonly pendingLabel: string;
}

export function GuideStep({
  stepNumber,
  title,
  body,
  href,
  openLabel,
  imageSrc,
  imageAlt,
  pendingLabel,
}: Readonly<GuideStepProps>) {
  return (
    <article
      className={`guide-step grid gap-4 border-t border-line pt-5 first:border-t-0 first:pt-0 ${imageSrc ? "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start lg:gap-6" : ""}`}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-bold tracking-[0.14em] text-leaf-700 uppercase">
          {stepNumber.toString().padStart(2, "0")}
        </p>
        <h3 className="mt-1 font-display text-xl font-semibold tracking-tight text-ink">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
        <a
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-leaf-700 px-4 py-2 text-sm font-semibold text-white hover:bg-leaf-800"
          href={href}
          target="_blank"
          rel="noreferrer noopener"
        >
          <ExternalLink size={16} aria-hidden="true" />
          {openLabel}
        </a>
      </div>
      {imageSrc ? (
        <figure className="overflow-hidden rounded-xl border border-line bg-leaf-50">
          <img
            className="h-auto w-full object-cover object-top"
            src={imageSrc}
            alt={imageAlt}
            width={960}
            height={540}
            loading="lazy"
          />
        </figure>
      ) : (
        <p className="rounded-xl border border-dashed border-line bg-leaf-50 px-4 py-6 text-sm text-muted lg:self-stretch lg:content-center">
          {pendingLabel}
        </p>
      )}
    </article>
  );
}
