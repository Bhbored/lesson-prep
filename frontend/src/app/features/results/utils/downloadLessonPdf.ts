export async function downloadLessonPdf(element: HTMLElement, variantNumber: number) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `result_${variantNumber}_${timestamp}.pdf`;
  // Snapshot the selected result before asynchronous loading or rendering.
  const source = element.cloneNode(true) as HTMLElement;
  source.classList.add("pdf-export");
  source.dir = getComputedStyle(element).direction;
  await document.fonts.ready;
  const { default: html2pdf } = await import("html2pdf.js");
  const options = {
    filename,
    margin: 16,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", windowWidth: 1024 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
    pagebreak: { mode: ["css"], avoid: [".result-hero", ".panel", "li"] },
  };
  const worker = html2pdf().set(options).from(source);
  let overlay: HTMLElement | undefined;
  try {
    await worker.toContainer().get("overlay", (value: unknown) => {
      if (value instanceof HTMLElement) overlay = value;
    });
    await worker.save();
  } finally {
    overlay?.remove();
  }
}
