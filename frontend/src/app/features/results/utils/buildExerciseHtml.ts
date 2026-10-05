import type { ExerciseSet, SessionTool } from "@/app/shared/schemas/domain";
import { escapeHtml } from "./htmlDocument";

export interface ExerciseLabels {
  readonly kind: string;
  readonly exercise: string;
  readonly question: string;
  readonly answerKey: string;
  readonly name: string;
  readonly date: string;
  readonly score: string;
}

type ExerciseKind = Exclude<SessionTool, "game">;

function choiceLetters(options: string[]) {
  return options
    .map(
      (option, index) =>
        `<li><span class="bubble">${String.fromCharCode(65 + index)}</span>${escapeHtml(option)}</li>`,
    )
    .join("");
}

function worksheetItems(set: ExerciseSet, labels: ExerciseLabels) {
  return set.items
    .map((item, index) => {
      const options = item.options
        .map((option) => `<li>${escapeHtml(option)}</li>`)
        .join("");
      const writing =
        item.type === "short"
          ? `<div class="write"><div class="lines"></div><div class="lines"></div><div class="lines"></div></div>`
          : item.type === "fill_blank"
            ? `<div class="blank"></div>`
            : item.type === "multiple_choice" || item.type === "true_false"
              ? `<ol class="choices soft">${options}</ol>`
              : "";
      return `<section class="item">
        <p class="num">${escapeHtml(labels.exercise)} ${index + 1}</p>
        <p class="prompt">${escapeHtml(item.prompt)}</p>
        ${writing}
      </section>`;
    })
    .join("");
}

function quizItems(set: ExerciseSet, labels: ExerciseLabels) {
  return set.items
    .map((item, index) => {
      if (item.type === "short") {
        return `<section class="item q">
          <p class="num">${escapeHtml(labels.question)} ${index + 1}</p>
          <p class="prompt">${escapeHtml(item.prompt)}</p>
          <div class="blank short"></div>
        </section>`;
      }
      return `<section class="item q">
        <p class="num">${escapeHtml(labels.question)} ${index + 1}</p>
        <p class="prompt">${escapeHtml(item.prompt)}</p>
        <ol class="choices bubbles">${choiceLetters(item.options)}</ol>
      </section>`;
    })
    .join("");
}

function answerKey(set: ExerciseSet, labels: ExerciseLabels) {
  const answers = set.items
    .map(
      (item, index) =>
        `<li><strong>${index + 1}.</strong> ${escapeHtml(item.answer)}${item.explanation ? ` — ${escapeHtml(item.explanation)}` : ""}</li>`,
    )
    .join("");
  return `<section class="key">
    <h2>${escapeHtml(labels.answerKey)}</h2>
    <ol>${answers}</ol>
  </section>`;
}

function worksheetHtml(set: ExerciseSet, labels: ExerciseLabels) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(set.title)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #ebe4d4; color: #2a241c; font: 16px/1.55 Georgia, "Times New Roman", serif; }
  main {
    width: min(46rem, calc(100% - 2rem)); margin: 1.4rem auto 3rem; padding: 2.2rem 2rem 2.6rem;
    background: #fbf6ea; border: 1px solid #d7cdb8; box-shadow: 0 18px 40px rgba(70, 55, 30, 0.08);
    background-image: linear-gradient(#fbf6ea 1.35rem, transparent 1.35rem),
      linear-gradient(90deg, transparent 2.4rem, rgba(190, 70, 70, 0.18) 2.4rem, rgba(190, 70, 70, 0.18) calc(2.4rem + 1px), transparent calc(2.4rem + 1px));
    background-size: 100% 1.35rem, 100% 100%;
  }
  .meta { display: flex; flex-wrap: wrap; gap: 1rem 1.5rem; margin: 0 0 1.2rem; font: 600 13px/1.3 "DM Sans", system-ui, sans-serif; color: #6b5d45; }
  .meta span { border-bottom: 1px solid #cfc5b0; min-width: 10rem; padding-bottom: 0.25rem; }
  .eyebrow { letter-spacing: 0.16em; text-transform: uppercase; font: 800 11px/1 "DM Sans", system-ui, sans-serif; color: #8a6b3d; }
  h1 { font-size: 1.9rem; margin: 0.35rem 0 0.55rem; }
  .intro { color: #5c5346; margin: 0 0 1.3rem; max-width: 38rem; }
  .item { padding: 0.95rem 0 1.05rem 0.4rem; border-top: 1px dashed #ddd2bc; }
  .num { font: 800 11px/1 "DM Sans", system-ui, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; color: #9a7a45; margin: 0 0 0.3rem; }
  .prompt { margin: 0; font-size: 1.05rem; }
  .choices.soft { margin: 0.65rem 0 0; padding-inline-start: 1.15rem; }
  .write { margin-top: 0.7rem; }
  .lines, .blank { border-bottom: 1px solid #cfc5b0; margin-top: 1.2rem; height: 1.25rem; }
  .key { margin-top: 2rem; padding-top: 1rem; border-top: 2px solid #2a241c; break-before: page; }
  .key h2 { font-size: 1.1rem; margin: 0 0 0.7rem; }
  @media print { body { background: #fff; } main { box-shadow: none; margin: 0; width: auto; border: 0; } }
</style>
</head>
<body>
<main>
  <p class="eyebrow">${escapeHtml(labels.kind)}</p>
  <h1>${escapeHtml(set.title)}</h1>
  <div class="meta"><span>${escapeHtml(labels.name)}</span><span>${escapeHtml(labels.date)}</span></div>
  ${set.instructions ? `<p class="intro">${escapeHtml(set.instructions)}</p>` : ""}
  ${worksheetItems(set, labels)}
  ${answerKey(set, labels)}
</main>
</body>
</html>`;
}

function quizHtml(set: ExerciseSet, labels: ExerciseLabels) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(set.title)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #dfe5ea; color: #1c2430; font: 15px/1.45 "Segoe UI", "Helvetica Neue", Arial, sans-serif; }
  main {
    width: min(42rem, calc(100% - 2rem)); margin: 1.2rem auto 2.8rem; padding: 0;
    background: #fff; border: 1px solid #c3ccd6; box-shadow: 0 16px 36px rgba(30, 45, 70, 0.1);
  }
  .banner {
    display: flex; justify-content: space-between; gap: 1rem; align-items: stretch;
    background: #1f3a56; color: #f4f7fb; padding: 1.1rem 1.3rem;
  }
  .banner .left { min-width: 0; }
  .eyebrow { letter-spacing: 0.18em; text-transform: uppercase; font: 800 10px/1 system-ui, sans-serif; opacity: 0.75; }
  h1 { font-size: 1.45rem; margin: 0.4rem 0 0; font-weight: 750; }
  .scorebox {
    flex: 0 0 auto; min-width: 6.5rem; border: 2px solid #9ec0e0; border-radius: 10px;
    padding: 0.55rem 0.7rem; text-align: center; background: rgba(255,255,255,0.08);
  }
  .scorebox strong { display: block; font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.8; }
  .scorebox em { display: block; margin-top: 0.35rem; font-style: normal; font-size: 1.35rem; font-weight: 800; }
  .sheet { padding: 1.2rem 1.3rem 1.8rem; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; margin: 0 0 1rem; }
  .meta label { display: block; font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; color: #627388; font-weight: 700; }
  .meta span { display: block; margin-top: 0.25rem; border-bottom: 1.5px solid #c3ccd6; min-height: 1.4rem; }
  .intro { margin: 0 0 1rem; color: #445266; font-size: 0.95rem; }
  .item.q { padding: 0.85rem 0; border-top: 1px solid #e4e9ef; }
  .num { margin: 0 0 0.25rem; font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase; color: #3d6ea5; font-weight: 800; }
  .prompt { margin: 0; font-weight: 650; }
  .choices.bubbles { list-style: none; margin: 0.65rem 0 0; padding: 0; display: grid; gap: 0.4rem; }
  .choices.bubbles li { display: flex; gap: 0.55rem; align-items: flex-start; padding: 0.45rem 0.55rem; border: 1px solid #d5dde6; border-radius: 8px; }
  .bubble {
    flex: 0 0 auto; width: 1.35rem; height: 1.35rem; border: 1.5px solid #3d6ea5; border-radius: 999px;
    display: grid; place-items: center; font: 700 0.72rem/1 system-ui, sans-serif; color: #3d6ea5;
  }
  .blank.short { border-bottom: 1.5px solid #c3ccd6; margin-top: 1rem; height: 1.3rem; }
  .key { margin: 0 1.3rem 1.5rem; padding-top: 1rem; border-top: 2px solid #1f3a56; break-before: page; }
  .key h2 { font-size: 1rem; margin: 0 0 0.65rem; }
  @media print { body { background: #fff; } main { box-shadow: none; margin: 0; width: auto; border: 0; } }
</style>
</head>
<body>
<main>
  <header class="banner">
    <div class="left">
      <p class="eyebrow">${escapeHtml(labels.kind)}</p>
      <h1>${escapeHtml(set.title)}</h1>
    </div>
    <div class="scorebox"><strong>${escapeHtml(labels.score)}</strong><em>___ / ${set.items.length}</em></div>
  </header>
  <div class="sheet">
    <div class="meta">
      <div><label>${escapeHtml(labels.name)}</label><span></span></div>
      <div><label>${escapeHtml(labels.date)}</label><span></span></div>
    </div>
    ${set.instructions ? `<p class="intro">${escapeHtml(set.instructions)}</p>` : ""}
    ${quizItems(set, labels)}
  </div>
  ${answerKey(set, labels)}
</main>
</body>
</html>`;
}

export function buildExerciseHtml(
  set: ExerciseSet,
  labels: ExerciseLabels,
  kind: ExerciseKind = "worksheet",
) {
  return kind === "quiz" ? quizHtml(set, labels) : worksheetHtml(set, labels);
}
