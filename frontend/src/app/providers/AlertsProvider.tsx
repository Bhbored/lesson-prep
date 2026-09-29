import type { ReactNode } from "react";
import { AlertContext, useAlertState } from "./alerts";

export function AlertsProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <AlertContext.Provider value={useAlertState()}>
      {children}
    </AlertContext.Provider>
  );
}
