import { createContext, useContext, useState } from "react";

export function useAlertState() {
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  return { error, setError, notice, setNotice };
}
export const AlertContext = createContext<ReturnType<
  typeof useAlertState
> | null>(null);
export function useAlerts() {
  const value = useContext(AlertContext);
  if (!value) throw new Error("AlertsProvider is required.");
  return value;
}
