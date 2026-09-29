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
      <section className="panel wide">
        <div className="panel-heading">
          <div className="panel-icon peach">
            <UploadCloud aria-hidden="true" size={20} />
          </div>
          <div>
            <h3>{t.material}</h3>
            <p>{t.materialHelp}</p>
          </div>
        </div>
        <label className="upload-zone">
          <input
            type="file"
            name="files"
            aria-invalid={Boolean(fieldErrors.files)}
            multiple
            accept=".pdf,.txt,.csv,application/pdf,text/plain,text/csv"
            onChange={(event) => setFiles(Array.from(event.target.files || []))}
          />
          <UploadCloud aria-hidden="true" size={25} />
          <strong>{t.chooseFiles}</strong>
          <span>
            {files.length
              ? files.map((x) => x.name).join(" · ")
              : t.materialHelp}
          </span>
        </label>
        {fieldErrors.files && (
          <p className="validation-text" role="alert">
            {fieldErrors.files}
          </p>
        )}
      </section>
    </>
  );
}
