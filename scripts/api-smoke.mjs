// Exercises the code-defined preset, upload, SSE, and stateless regeneration snapshot.
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
const root = "http://127.0.0.1:5132";
const presets = await (await fetch(`${root}/api/lesson-flow-presets`)).json();
if (
  presets[0]?.phases.reduce((sum, phase) => sum + phase.durationMinutes, 0) !==
  45
)
  throw new Error("Default preset is wrong");
const { keyId, spki } = await (await fetch(`${root}/api/ai/public-key`)).json();
const publicKey = await webcrypto.subtle.importKey(
  "spki",
  Buffer.from(spki, "base64"),
  { name: "RSA-OAEP", hash: "SHA-256" },
  false,
  ["encrypt"],
);
const aes = await webcrypto.subtle.generateKey(
  { name: "AES-GCM", length: 256 },
  true,
  ["encrypt"],
);
const raw = await webcrypto.subtle.exportKey("raw", aes);
const nonce = webcrypto.getRandomValues(new Uint8Array(12));
const envelope = {
  keyId,
  wrappedKey: Buffer.from(
    await webcrypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, raw),
  ).toString("base64"),
  nonce: Buffer.from(nonce).toString("base64"),
  ciphertext: Buffer.from(
    await webcrypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      aes,
      new TextEncoder().encode("unused-test-key"),
    ),
  ).toString("base64"),
};
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
form.append("encryptedCredential", JSON.stringify(envelope));
const response = await fetch(`${root}/api/lesson-preparations/generate`, {
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
const regenerated = await fetch(`${root}/api/lesson-preparations/regenerate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ snapshot, variantCount: 3, generationRound: 2,
    provider: "invalid", model: "unused", encryptedCredential: envelope }),
});
if (regenerated.status !== 400)
  throw new Error(`Stateless regeneration did not validate snapshot: ${regenerated.status}`);
if (process.env.CHECK_KEY_DECRYPT === "1") {
  const lookup = await fetch(`${root}/api/ai/providers/deepseek/models`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(envelope),
    signal: AbortSignal.timeout(20000),
  });
  if (lookup.status !== 401)
    throw new Error(
      `Expected provider rejection of decrypted test key, got ${lookup.status}`,
    );
}
if (process.env.CHECK_PDF === "1") {
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
    await fetch(`${root}/api/lesson-preparations/generate`, {
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
