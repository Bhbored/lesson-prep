// Exercises the code-defined preset, upload, SSE, and stateless regeneration snapshot.
const root = "http://127.0.0.1:5132";
const api = `${root}/lessonprep/v1.0`;
const presets = await (await fetch(`${api}/LessonFlowPresets`)).json();
if (
  presets[0]?.phases.reduce((sum, phase) => sum + phase.durationMinutes, 0) !==
  45
)
  throw new Error("Default preset is wrong");
const issued = await (
  await fetch(`${api}/Ai/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "deepSeek", apiKey: "unused-test-key" }),
  })
).json();
if (!issued?.token || typeof issued.token !== "string")
  throw new Error("Credential token was not issued");
const token = issued.token;
const form = new FormData();
form.append(
  "files",
  new Blob(
    [
      "Photosynthesis uses sunlight and water to help plants make food. Students can observe leaves and discuss how light affects growth.",
    ],
    { type: "text/plain" },
  ),
  "plants.txt",
);
form.append("className", "Grade 7");
form.append("totalDurationMinutes", "45");
form.append("sourceLanguage", "en");
form.append("variantCount", "3");
form.append("provider", "invalid"); // Stop before an external AI request.
form.append("model", "unused");
form.append("lessonFlowPresetId", presets[0].id);
form.append("credentialToken", token);
const response = await fetch(`${api}/LessonPreparations/generate`, {
  method: "POST",
  body: form,
});
const events = await response.text();
const snapshotJson = /event: preparation\ndata: (\{[^\n]+\})/.exec(events)?.[1];
const snapshot = snapshotJson ? JSON.parse(snapshotJson) : null;
if (
  !snapshot?.preparationId ||
  !events.includes("event: status") ||
  !events.includes("event: error")
)
  throw new Error(`Unexpected SSE events: ${events}`);
if (snapshot.className !== "Grade 7" || snapshot.phases.length !== 5 ||
    !snapshot.sourceText.includes("Photosynthesis"))
  throw new Error("Preparation snapshot was not returned for browser storage");
const regenerated = await fetch(`${api}/LessonPreparations/regenerate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ snapshot, variantCount: 3, generationRound: 2,
    provider: "invalid", model: "unused", credentialToken: token }),
});
if (regenerated.status !== 400)
  throw new Error(`Stateless regeneration did not validate snapshot: ${regenerated.status}`);
if (process.env.CHECK_KEY_DECRYPT === "1") {
  const lookup = await fetch(`${api}/Ai/providers/deepSeek/models`, {
    method: "POST",
    headers: { "X-Provider-Token": token },
    signal: AbortSignal.timeout(20000),
  });
  if (lookup.status !== 401)
    throw new Error(
      `Expected provider rejection of decrypted test key, got ${lookup.status}`,
    );
}
if (process.env.CHECK_PDF === "1") {
  const { readFileSync } = await import("node:fs");
  const pdfForm = new FormData();
  for (const [key, value] of form.entries())
    if (key !== "files") pdfForm.append(key, value);
  pdfForm.append(
    "files",
    new Blob([readFileSync("backend/LessonPrep.Tests/Fixtures/mixed.pdf")], {
      type: "application/pdf",
    }),
    "mixed.pdf",
  );
  const pdfStream = await (
    await fetch(`${api}/LessonPreparations/generate`, {
      method: "POST",
      body: pdfForm,
      signal: AbortSignal.timeout(120000),
    })
  ).text();
  if (
    !pdfStream.includes("event: preparation") ||
    !pdfStream.includes("event: error")
  )
    throw new Error(`PDF pipeline failed: ${pdfStream}`);
  console.log("PDF upload and OCR fallback reached generation");
}
console.log("API smoke passed:", snapshot.preparationId, "static preset, SSE, and stateless snapshot");
