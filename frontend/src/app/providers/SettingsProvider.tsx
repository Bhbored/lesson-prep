import type { ReactNode } from "react";
import { SettingsContext, useSettingsState } from "./settings";

export function SettingsProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <SettingsContext.Provider value={useSettingsState()}>
      {children}
    </SettingsContext.Provider>
  );
}
