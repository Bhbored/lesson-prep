import type { ReactNode } from "react";
import { PresetsContext, usePresetsState } from "./presets";

export function PresetsProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <PresetsContext.Provider value={usePresetsState()}>
      {children}
    </PresetsContext.Provider>
  );
}
