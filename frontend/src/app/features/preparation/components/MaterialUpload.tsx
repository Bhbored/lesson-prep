import { UploadCloud } from "lucide-react";
import type { usePreparePage } from "@/app/features/preparation/hooks/usePreparePage";
interface MaterialUploadProps {
  readonly model: Pick<
    ReturnType<typeof usePreparePage>,
    "t" | "files" | "setFiles" | "fieldErrors"
  >;
}
export function MaterialUpload({ model }: Readonly<MaterialUploadProps>) {
  const { t, files, setFiles, fieldErrors } = model;
  return (
    <>
      <section className="panel wide col-span-full rounded-xl border border-line bg-paper p-5 sm:p-6">
        <div className="panel-heading mb-5 flex items-center gap-3">
          <div className="panel-icon peach grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
            <UploadCloud aria-hidden="true" size={20} />
          </div>
          <div>
            <h3 className="font-semibold">{t.material}</h3>
            <p className="mt-0.5 text-xs text-muted">{t.materialHelp}</p>
          </div>
        </div>
        <label className="upload-zone flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-leaf-300 bg-leaf-50 p-5 text-center text-leaf-700 hover:border-leaf-500 hover:bg-leaf-100 focus-within:ring-2 focus-within:ring-leaf-300">
          <input
            className="sr-only"
            type="file"
            name="files"
            aria-invalid={Boolean(fieldErrors.files)}
            multiple
            accept=".pdf,.txt,.csv,application/pdf,text/plain,text/csv"
            onChange={(event) => setFiles(Array.from(event.target.files || []))}
          />
          <UploadCloud aria-hidden="true" size={25} />
          <strong className="text-sm">{t.chooseFiles}</strong>
          <span className="max-w-full break-words text-xs text-muted">
            {files.length
              ? files.map((x) => x.name).join(" · ")
              : t.materialHelp}
          </span>
        </label>
        {fieldErrors.files && (
          <p className="validation-text mt-1 text-xs text-red-700" role="alert">
            {fieldErrors.files}
          </p>
        )}
      </section>
    </>
  );
}
