import { useState } from "react";
import { CircleHelp } from "lucide-react";
import { providerIds } from "@/app/shared/data/providers";
import { providerNames } from "@/app/shared/data/providers";
import type { ProviderId, SessionTool } from "@/app/shared/schemas/domain";
import { useI18n } from "@/app/providers/i18n";
import { ProviderGuideSection } from "../components/ProviderGuideSection";
import { GuideTabList, GuideTabPanel } from "../components/GuideTabList";
import { SessionToolsGuidePanel } from "../components/SessionToolsGuidePanel";

type GuideSection = "keys" | "tools";

const toolIds: SessionTool[] = ["worksheet", "quiz", "game"];

export default function GuidePage() {
  const t = useI18n();
  const [section, setSection] = useState<GuideSection>("keys");
  const [provider, setProvider] = useState<ProviderId>(providerIds[0]);
  const [tool, setTool] = useState<SessionTool>("worksheet");

  const sectionTabs = [
    { id: "keys", label: t.guideTabKeys },
    { id: "tools", label: t.guideTabTools },
  ] as const;

  const providerTabs = providerIds.map((id) => ({
    id,
    label: providerNames[id],
  }));

  const toolTabs = toolIds.map((id) => ({
    id,
    label: id === "worksheet" ? t.worksheet : id === "quiz" ? t.quiz : t.game,
  }));

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

      <GuideTabList
        label={t.guideSectionLabel}
        tabs={sectionTabs}
        value={section}
        onChange={(id) => setSection(id as GuideSection)}
      />

      <GuideTabPanel
        id="keys"
        active={section === "keys"}
        labelledBy="guide-tab-keys"
      >
        <GuideTabList
          label={t.guideJumpLabel}
          tabs={providerTabs}
          value={provider}
          onChange={(id) => setProvider(id as ProviderId)}
          size="nested"
        />
        {providerIds.map((id) => (
          <GuideTabPanel
            key={id}
            id={id}
            active={provider === id}
            labelledBy={`guide-tab-${id}`}
          >
            <ProviderGuideSection provider={id} />
          </GuideTabPanel>
        ))}
      </GuideTabPanel>

      <GuideTabPanel
        id="tools"
        active={section === "tools"}
        labelledBy="guide-tab-tools"
      >
        <p className="mb-5 max-w-2xl text-sm leading-relaxed text-muted">
          {t.guideToolsHelp}
        </p>
        <GuideTabList
          label={t.guideToolsKindsLabel}
          tabs={toolTabs}
          value={tool}
          onChange={(id) => setTool(id as SessionTool)}
          size="nested"
        />
        {toolIds.map((id) => (
          <GuideTabPanel
            key={id}
            id={id}
            active={tool === id}
            labelledBy={`guide-tab-${id}`}
          >
            <SessionToolsGuidePanel tool={id} />
          </GuideTabPanel>
        ))}
      </GuideTabPanel>
    </div>
  );
}
