import { TriangleAlert } from "lucide-react";

interface KeySaveWarningProps {
  readonly title: string;
  readonly body: string;
}

export function KeySaveWarning({ title, body }: Readonly<KeySaveWarningProps>) {
  return (
    <aside
      className="key-save-warning flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-900"
      role="note"
    >
      <TriangleAlert
        className="mt-0.5 shrink-0 text-red-600"
        size={20}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-red-800/90">{body}</p>
      </div>
    </aside>
  );
}
