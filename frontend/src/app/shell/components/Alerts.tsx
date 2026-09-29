import { useAlerts } from "@/app/providers/alerts";

export function Alerts() {
  const { error, notice, setError, setNotice } = useAlerts();
  return (
    <>
      {error && (
        <div className="alert error my-4 flex items-center justify-between gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-800" role="alert">
          {error}
          <button className="grid min-h-11 min-w-11 place-items-center rounded-lg hover:bg-red-100" aria-label="Dismiss error" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}
      {notice && (
        <div className="alert success my-4 flex items-center justify-between gap-3 rounded-lg bg-leaf-100 p-4 text-sm text-leaf-800" role="status">
          {notice}
          <button className="grid min-h-11 min-w-11 place-items-center rounded-lg hover:bg-leaf-200" aria-label="Dismiss notice" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
    </>
  );
}
