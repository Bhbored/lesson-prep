import { useAlerts } from "@/app/providers/alerts";

export function Alerts() {
  const { error, notice, setError, setNotice } = useAlerts();
  return (
    <>
      {error && (
        <div className="alert error" role="alert">
          {error}
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}
      {notice && (
        <div className="alert success" role="status">
          {notice}
          <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
    </>
  );
}
