import type { ReactNode } from "react";

export interface GuideTabItem {
  readonly id: string;
  readonly label: string;
}

interface GuideTabListProps {
  readonly label: string;
  readonly tabs: readonly GuideTabItem[];
  readonly value: string;
  readonly onChange: (id: string) => void;
  readonly size?: "primary" | "nested";
}

export function GuideTabList({
  label,
  tabs,
  value,
  onChange,
  size = "primary",
}: Readonly<GuideTabListProps>) {
  const primary = size === "primary";
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`flex flex-wrap gap-2 ${primary ? "mb-6" : "mb-5"}`}
    >
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`guide-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`guide-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            className={`inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-semibold transition-colors ${
              selected
                ? "border-leaf-500 bg-leaf-50 text-leaf-800"
                : "border-line bg-paper text-ink hover:border-leaf-300 hover:bg-leaf-50"
            } ${primary ? "" : "text-xs sm:text-sm"}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

interface GuideTabPanelProps {
  readonly id: string;
  readonly active: boolean;
  readonly labelledBy: string;
  readonly children: ReactNode;
}

export function GuideTabPanel({
  id,
  active,
  labelledBy,
  children,
}: Readonly<GuideTabPanelProps>) {
  if (!active) return null;
  return (
    <div
      role="tabpanel"
      id={`guide-panel-${id}`}
      aria-labelledby={labelledBy}
      className="max-w-5xl"
    >
      {children}
    </div>
  );
}
