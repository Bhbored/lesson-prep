import type { ReactNode } from "react";
import { PreparationContext, usePreparationState } from "./preparation";

export function PreparationProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <PreparationContext.Provider value={usePreparationState()}>
      {children}
    </PreparationContext.Provider>
  );
}
