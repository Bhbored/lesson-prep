import type { Game } from "@/app/shared/schemas/domain";
import { embedJson, escapeHtml, saveHtmlFile } from "./htmlDocument";

type Band = "early" | "middle" | "upper";

const themes = {
  early: {
    fonts: "Fraunces:opsz,wght@9..144,600;800&family=Nunito:wght@600;800",
    face: `"Nunito", "Trebuchet MS", sans-serif`,
    display: `"Fraunces", Georgia, serif`,
    ink: "#2a2214",
    accent: "#ff7a3d",
    accent2: "#22b573",
    paper: "rgba(255,251,244,0.92)",
  },
  middle: {
    fonts: "Literata:opsz,wght@7..72,600;800&family=Source+Serif+4:opsz,wght@8..60,500;700",
    face: `"Source Serif 4", Georgia, serif`,
    display: `"Literata", "Palatino Linotype", serif`,
    ink: "#1f2a22",
    accent: "#c45c12",
    accent2: "#1a6b4f",
    paper: "rgba(255,246,228,0.94)",
  },
  upper: {
    fonts: "Space+Grotesk:wght@500;600;700&family=Syne:wght@700;800",
    face: `"Space Grotesk", "Segoe UI", sans-serif`,
    display: `"Syne", "Space Grotesk", sans-serif`,
    ink: "#f4efe4",
    accent: "#ffc857",
    accent2: "#5ef0d0",
    paper: "rgba(12, 18, 24, 0.82)",
  },
} as const;

function bandCss(band: Band) {
  if (band === "early")
    return `
  body {
    background:
      radial-gradient(900px 560px at 8% -8%, #ffe29a 0%, transparent 55%),
      radial-gradient(780px 520px at 100% 0%, #9cf0c2 0%, transparent 50%),
      radial-gradient(700px 480px at 50% 110%, #9ed8ff 0%, transparent 48%),
      linear-gradient(165deg, #fff4e4, #e9fff2 48%, #dff4ff);
  }
  .sky {
    position: fixed; inset: 0; overflow: hidden; pointer-events: none; z-index: 0;
  }
  .blob {
    position: absolute; border-radius: 999px; filter: blur(2px);
    animation: floaty 7s ease-in-out infinite;
  }
  .blob.a { width: 220px; height: 220px; left: -40px; top: 18%; background: #ffd27a; opacity: 0.55; }
  .blob.b { width: 180px; height: 180px; right: -30px; top: 8%; background: #7de8b0; opacity: 0.5; animation-delay: -2s; }
  .blob.c { width: 140px; height: 140px; left: 42%; bottom: 8%; background: #8fd3ff; opacity: 0.45; animation-delay: -4s; }
  .petal {
    position: absolute; width: 14px; height: 18px; border-radius: 60% 60% 50% 50%;
    background: #ff8f5a; opacity: 0.7; animation: drift 11s linear infinite;
  }
  .petal:nth-child(4) { left: 12%; animation-delay: -1s; background: #ffc45c; }
  .petal:nth-child(5) { left: 35%; animation-delay: -3s; background: #6fd89a; }
  .petal:nth-child(6) { left: 58%; animation-delay: -5s; background: #7ec8ff; }
  .petal:nth-child(7) { left: 78%; animation-delay: -7s; background: #ff8f5a; }
  .hero {
    background: ${themes.early.paper}; border: 3px solid #ffe0b0; border-radius: 32px;
    box-shadow: 0 18px 0 #ffc57a, 0 28px 50px rgba(255, 140, 70, 0.2);
    animation: pop-in 0.55s cubic-bezier(.2,1.4,.4,1) both;
  }
  .host {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.35rem 0.7rem; border-radius: 999px; background: #ffe7c2;
    animation: wiggle 2.8s ease-in-out infinite;
  }
  .host::before { content: "✿"; }
  #board {
    background: ${themes.early.paper}; border: 3px solid #c9f0d8; border-radius: 32px;
    box-shadow: 0 16px 0 #8fe0b0, 0 28px 40px rgba(40, 160, 100, 0.15);
    animation: pop-in 0.7s cubic-bezier(.2,1.4,.4,1) both;
  }
  button.choice {
    border: 3px solid #ffe0b0; border-radius: 20px; background: #fff;
    box-shadow: 0 5px 0 #ffd08a; transition: transform 140ms ease, box-shadow 140ms ease;
  }
  button.choice:hover { transform: translateY(-3px) rotate(-0.5deg); box-shadow: 0 8px 0 #ffd08a; }
  button.choice:active { transform: translateY(2px); box-shadow: 0 2px 0 #ffd08a; }
  button.choice.correct {
    background: #d8ffe8; border-color: #22b573; box-shadow: 0 5px 0 #8fd9b0;
    animation: bounce-ok 0.55s cubic-bezier(.2,1.5,.4,1);
  }
  button.choice.wrong {
    background: #ffe3dc; border-color: #e85a45; box-shadow: 0 5px 0 #f0a090;
    animation: shake 0.4s ease;
  }
  button.choice.picked { border-color: #ff7a3d; background: #fff0e4; }
  button.next {
    border: 0; border-radius: 999px; background: linear-gradient(135deg, #ff8a3d, #ffb347);
    color: #fffaf3; box-shadow: 0 8px 0 #e06a28; animation: pulse-soft 1.8s ease-in-out infinite;
  }
  button.next:hover { transform: translateY(-2px); }
  .burst { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
  .burst i {
    position: absolute; width: 10px; height: 10px; border-radius: 2px;
    animation: confetti 0.9s ease-out forwards;
  }
  @keyframes floaty { 50% { transform: translateY(-18px) scale(1.05); } }
  @keyframes drift {
    0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
    15% { opacity: 0.8; }
    100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
  }
  @keyframes bounce-ok { 0% { transform: scale(0.9); } 55% { transform: scale(1.08); } 100% { transform: scale(1); } }
  @keyframes shake { 25% { transform: translateX(-6px); } 50% { transform: translateX(6px); } 75% { transform: translateX(-3px); } }
  @keyframes wiggle { 40%, 60% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
  @keyframes pulse-soft { 50% { transform: scale(1.03); } }
  @keyframes confetti {
    0% { transform: translate(0,0) rotate(0); opacity: 1; }
    100% { transform: translate(var(--dx), var(--dy)) rotate(240deg); opacity: 0; }
  }
`;
  if (band === "middle")
    return `
  body {
    background:
      radial-gradient(800px 480px at 0% 0%, #efd09a 0%, transparent 55%),
      radial-gradient(760px 500px at 100% 100%, #7eae93 0%, transparent 50%),
      linear-gradient(155deg, #f3e2c2 0%, #e4ebcf 52%, #c8d8c4 100%);
  }
  body::before {
    content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M0 40h80M40 0v80' stroke='%23957b4d' stroke-opacity='0.08' stroke-width='1'/%3E%3C/svg%3E");
    opacity: 0.9;
  }
  .sky {
    position: fixed; inset: 0; overflow: hidden; pointer-events: none; z-index: 0;
  }
  .compass {
    position: absolute; right: 6%; top: 10%; width: 120px; height: 120px;
    border: 3px solid rgba(180, 110, 40, 0.35); border-radius: 999px;
    background: radial-gradient(circle at 50% 50%, #fff6e4 0%, #e8d2a4 70%);
    box-shadow: 0 12px 30px rgba(80, 50, 20, 0.15);
    animation: spin-slow 18s linear infinite;
  }
  .compass::after {
    content: ""; position: absolute; left: 50%; top: 12%; width: 4px; height: 38%;
    background: linear-gradient(#c45c12, #1a6b4f); transform: translateX(-50%);
    border-radius: 2px;
  }
  .trail {
    position: absolute; left: 8%; bottom: 12%; width: 220px; height: 90px;
    border: 2px dashed rgba(150, 100, 40, 0.28); border-radius: 50%;
    transform: rotate(-18deg); animation: dash 8s linear infinite;
  }
  .hero {
    background: ${themes.middle.paper}; border: 1px solid rgba(120, 80, 30, 0.18);
    border-radius: 8px 28px 8px 28px; box-shadow: 0 18px 40px rgba(50, 40, 20, 0.14);
    position: relative; overflow: hidden; animation: slide-up 0.55s ease both;
  }
  .hero::before {
    content: ""; position: absolute; inset: 0; pointer-events: none;
    background: repeating-linear-gradient(-12deg, transparent, transparent 11px, rgba(150,110,50,0.035) 11px, rgba(150,110,50,0.035) 12px);
  }
  .host {
    letter-spacing: 0.16em; color: #c45c12;
    animation: stamp 0.7s cubic-bezier(.2,1.4,.3,1) both;
  }
  .host::before { content: "✦ "; }
  #board {
    background: ${themes.middle.paper}; border: 1px solid rgba(120, 80, 30, 0.18);
    border-radius: 28px 8px 28px 8px; box-shadow: 0 18px 40px rgba(50, 40, 20, 0.12);
    animation: slide-up 0.7s ease both;
  }
  button.choice {
    border: 1.5px solid rgba(120, 80, 30, 0.22); border-radius: 14px;
    background: linear-gradient(#fffaf0, #f4e7cc); box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
    transition: transform 160ms ease, box-shadow 160ms ease;
  }
  button.choice:hover { transform: translateY(-2px); box-shadow: 0 8px 18px rgba(80,50,20,0.12); }
  button.choice.correct {
    background: #dcefe4; border-color: #1a6b4f;
    animation: ink-stamp 0.45s ease;
  }
  button.choice.wrong { background: #f8e2d8; border-color: #b54832; animation: shake 0.35s ease; }
  button.choice.picked {
    border-color: #c45c12; box-shadow: inset 0 0 0 2px #c45c12;
    animation: pulse-ring 1.2s ease-in-out infinite;
  }
  button.next {
    border: 0; border-radius: 12px; background: linear-gradient(135deg, #c45c12, #9a4310);
    color: #fff8ef; box-shadow: 0 8px 18px rgba(160, 70, 20, 0.25);
  }
  .track > i { transition: width 0.55s cubic-bezier(.2,.8,.2,1); }
  @keyframes spin-slow { to { transform: rotate(360deg); } }
  @keyframes dash { to { stroke-dashoffset: -40; border-spacing: 8px; } }
  @keyframes slide-up { from { opacity: 0; transform: translateY(18px); } }
  @keyframes stamp { from { opacity: 0; transform: scale(1.4) rotate(-8deg); } }
  @keyframes ink-stamp { 0% { transform: scale(1.15); } 100% { transform: scale(1); } }
  @keyframes pulse-ring { 50% { box-shadow: inset 0 0 0 2px #c45c12, 0 0 0 6px rgba(196,92,18,0.12); } }
  @keyframes shake { 25% { transform: translateX(-5px); } 50% { transform: translateX(5px); } 75% { transform: translateX(-2px); } }
`;
  return `
  body {
    background:
      radial-gradient(700px 480px at 12% -10%, #4a2d12 0%, transparent 50%),
      radial-gradient(640px 460px at 100% 90%, #0d3d42 0%, transparent 48%),
      linear-gradient(165deg, #070b10 0%, #101820 50%, #0a1412 100%);
  }
  body::before {
    content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.02) 3px);
    animation: scan 7s linear infinite;
  }
  .sky {
    position: fixed; inset: 0; overflow: hidden; pointer-events: none; z-index: 0;
  }
  .ring {
    position: absolute; border-radius: 999px; border: 1px solid rgba(94, 240, 208, 0.22);
    animation: expand 5.5s ease-out infinite;
  }
  .ring.a { width: 180px; height: 180px; left: 8%; top: 18%; }
  .ring.b { width: 260px; height: 260px; right: 4%; bottom: 12%; animation-delay: -2s; border-color: rgba(255,200,87,0.18); }
  .grid-glow {
    position: absolute; inset: 20% 10% auto; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(94,240,208,0.45), transparent);
    animation: sweep 4.5s ease-in-out infinite;
  }
  .hero {
    background: ${themes.upper.paper}; border: 1px solid rgba(255, 200, 87, 0.22);
    border-radius: 22px; box-shadow: 0 0 0 1px rgba(94,240,208,0.08), 0 24px 60px rgba(0,0,0,0.45);
    backdrop-filter: blur(18px); animation: boot 0.6s cubic-bezier(.2,.9,.3,1) both;
  }
  .host {
    color: #5ef0d0; letter-spacing: 0.18em;
    text-shadow: 0 0 18px rgba(94, 240, 208, 0.45);
    animation: flicker 3.5s step-end infinite;
  }
  .host::before { content: "▍ "; }
  h1 { text-shadow: 0 0 30px rgba(255, 200, 87, 0.2); }
  #board {
    background: ${themes.upper.paper}; border: 1px solid rgba(94, 240, 208, 0.18);
    border-radius: 22px; box-shadow: 0 24px 60px rgba(0,0,0,0.4);
    backdrop-filter: blur(18px); animation: boot 0.75s cubic-bezier(.2,.9,.3,1) both;
  }
  button.choice {
    border: 1px solid rgba(255, 200, 87, 0.22); border-radius: 12px;
    background: rgba(20, 30, 36, 0.9); color: #f4efe4;
    transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
  }
  button.choice:hover {
    transform: translateY(-2px);
    border-color: #ffc857; box-shadow: 0 0 22px rgba(255, 200, 87, 0.18);
  }
  button.choice.correct {
    border-color: #5ef0d0; background: rgba(20, 60, 52, 0.9);
    box-shadow: 0 0 28px rgba(94, 240, 208, 0.28);
    animation: lock-in 0.45s ease;
  }
  button.choice.wrong {
    border-color: #ff6b5a; background: rgba(60, 24, 22, 0.95);
    animation: glitch 0.35s steps(2);
  }
  button.choice.picked {
    border-color: #ffc857; box-shadow: 0 0 0 1px #ffc857, 0 0 24px rgba(255,200,87,0.25);
  }
  button.next {
    border: 0; border-radius: 10px;
    background: linear-gradient(135deg, #ffc857, #e8a020); color: #12140f;
    box-shadow: 0 0 28px rgba(255, 200, 87, 0.25);
  }
  .track { background: rgba(255,255,255,0.08); }
  .track > i {
    background: linear-gradient(90deg, #ffc857, #5ef0d0);
    box-shadow: 0 0 16px rgba(94, 240, 208, 0.5);
    transition: width 0.45s ease;
  }
  @keyframes scan { to { transform: translateY(12px); } }
  @keyframes expand {
    0% { transform: scale(0.7); opacity: 0.5; }
    100% { transform: scale(1.5); opacity: 0; }
  }
  @keyframes sweep {
    0%, 100% { opacity: 0.2; transform: translateX(-20%); }
    50% { opacity: 0.9; transform: translateX(20%); }
  }
  @keyframes boot { from { opacity: 0; transform: translateY(14px) scale(0.98); } }
  @keyframes flicker { 92% { opacity: 1; } 93% { opacity: 0.45; } 94% { opacity: 1; } 96% { opacity: 0.7; } }
  @keyframes lock-in { 0% { transform: scale(0.96); filter: brightness(1.4); } 100% { transform: scale(1); } }
  @keyframes glitch {
    20% { transform: translate(-3px, 1px); }
    40% { transform: translate(3px, -1px); }
    60% { transform: translate(-2px, 0); }
  }
`;
}

function bandDecor(band: Band) {
  if (band === "early")
    return `<div class="sky" aria-hidden="true">
  <span class="blob a"></span><span class="blob b"></span><span class="blob c"></span>
  <span class="petal"></span><span class="petal"></span><span class="petal"></span><span class="petal"></span>
</div>`;
  if (band === "middle")
    return `<div class="sky" aria-hidden="true"><span class="compass"></span><span class="trail"></span></div>`;
  return `<div class="sky" aria-hidden="true"><span class="ring a"></span><span class="ring b"></span><span class="grid-glow"></span></div>`;
}

export function shuffleChoiceItem<T extends { options: string[]; correctIndex: number }>(
  item: T,
  random: () => number = Math.random,
): T {
  if (item.options.length < 2) return item;
  const correct = item.options[item.correctIndex] ?? item.options[0];
  const order = item.options.map((_, index) => index);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const options = order.map((index) => item.options[index]);
  const correctIndex = Math.max(0, options.indexOf(correct));
  return { ...item, options, correctIndex };
}

export function buildGameHtml(game: Game, scoreLabel = "Score") {
  const band: Band =
    game.band === "early" || game.band === "upper" ? game.band : "middle";
  const theme = themes[band];
  const title = escapeHtml(game.title);
  const hook = escapeHtml(game.hook);
  const host = escapeHtml(game.host);
  const stages = (game.adventure?.stages ?? []).map((stage) =>
    shuffleChoiceItem(stage),
  );
  const rounds = (game.race?.rounds ?? []).map((round) =>
    shuffleChoiceItem(round),
  );
  const data = embedJson({
    title: game.title,
    kind: game.kind,
    hook: game.hook,
    host: game.host,
    band,
    stages,
    pairs: game.matching?.pairs ?? [],
    rounds,
    scoreLabel,
  });
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${theme.fonts}&display=swap">
<style>
  :root { color-scheme: ${band === "upper" ? "dark" : "light"}; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; color: ${theme.ink};
    font-family: ${theme.face}; overflow-x: hidden;
  }
  main { position: relative; z-index: 1; width: min(46rem, calc(100% - 2rem)); margin: 0 auto; padding: 2.4rem 0 3.4rem; }
  .hero { padding: 1.6rem 1.6rem 1.4rem; position: relative; }
  .host { font-size: 0.82rem; letter-spacing: 0.12em; text-transform: uppercase; color: ${theme.accent}; font-weight: 800; margin: 0; }
  h1 { font-family: ${theme.display}; font-size: clamp(1.85rem, 4.5vw, 2.8rem); line-height: 1.05; margin: 0.4rem 0 0.55rem; }
  .hook { margin: 0; opacity: 0.84; max-width: 36rem; }
  #score { margin: 0.85rem 0 0; font-weight: 800; color: ${theme.accent2}; animation: pop-in 0.45s ease both; }
  #board { margin-top: 1.15rem; padding: 1.4rem; min-height: 16rem; position: relative; }
  .prompt { font-family: ${theme.display}; font-size: 1.35rem; margin: 0 0 1rem; animation: fade-up 0.35s ease both; }
  .options, .cols { display: grid; gap: 0.75rem; }
  .cols { grid-template-columns: 1fr 1fr; }
  button.choice, button.next {
    font: inherit; cursor: pointer; text-align: start; min-height: 50px;
    padding: 0.85rem 1rem; color: inherit;
  }
  button.next { margin-top: 1rem; font-weight: 800; }
  .flavor { margin: 0.95rem 0 0; opacity: 0.85; animation: fade-up 0.3s ease both; }
  .track { height: 10px; border-radius: 99px; background: rgba(0,0,0,0.08); overflow: hidden; margin: 0 0 1rem; }
  .track > i { display: block; height: 100%; width: 0; border-radius: inherit; background: linear-gradient(90deg, ${theme.accent}, ${theme.accent2}); }
  .pop-in { animation: pop-in 0.45s cubic-bezier(.2,1.3,.4,1) both; }
  @keyframes pop-in { from { opacity: 0; transform: scale(0.92) translateY(10px); } }
  @keyframes fade-up { from { opacity: 0; transform: translateY(8px); } }
  @media (max-width: 640px) { .cols { grid-template-columns: 1fr; } }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
  }
  ${bandCss(band)}
</style>
</head>
<body class="band-${band}">
${bandDecor(band)}
<main>
  <header class="hero">
    ${host ? `<p class="host">${host}</p>` : ""}
    <h1>${title}</h1>
    ${hook ? `<p class="hook">${hook}</p>` : ""}
    <p id="score" hidden></p>
  </header>
  <section id="board"></section>
</main>
<script>
(function () {
  var game = ${data};
  var board = document.getElementById("board");
  var scoreEl = document.getElementById("score");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function showScore(text) {
    scoreEl.hidden = false;
    scoreEl.textContent = text;
    scoreEl.className = "pop-in";
  }
  function celebrate() {
    if (reduced || game.band !== "early") return;
    var burst = el("div", "burst");
    var colors = ["#ff7a3d", "#22b573", "#7ec8ff", "#ffc45c", "#ff8f5a"];
    for (var i = 0; i < 18; i++) {
      var bit = el("i", "", "");
      bit.style.left = "50%";
      bit.style.top = "40%";
      bit.style.background = colors[i % colors.length];
      bit.style.setProperty("--dx", (Math.random() * 260 - 130) + "px");
      bit.style.setProperty("--dy", (Math.random() * 180 - 40) + "px");
      burst.appendChild(bit);
    }
    board.appendChild(burst);
    setTimeout(function () { burst.remove(); }, 950);
  }
  function playAdventure() {
    var index = 0, correct = 0, locked = false;
    var stages = game.stages || [];
    function render() {
      locked = false; clear(board);
      if (index >= stages.length) {
        showScore(game.scoreLabel + ": " + correct + " / " + stages.length);
        board.appendChild(el("p", "prompt", "The path is complete."));
        celebrate();
        return;
      }
      var item = stages[index];
      var track = el("div", "track"); var fill = el("i", "", "");
      fill.style.width = ((index / stages.length) * 100) + "%";
      track.appendChild(fill); board.appendChild(track);
      board.appendChild(el("p", "prompt", item.prompt));
      var options = el("div", "options");
      item.options.forEach(function (option, optionIndex) {
        var button = el("button", "choice", option);
        button.addEventListener("click", function () {
          if (locked) return; locked = true;
          var ok = optionIndex === item.correctIndex;
          if (ok) { correct += 1; celebrate(); }
          button.className = "choice " + (ok ? "correct" : "wrong");
          if (!ok && options.children[item.correctIndex]) options.children[item.correctIndex].className = "choice correct";
          board.appendChild(el("p", "flavor", ok ? (item.success || "") : (item.miss || "")));
          var next = el("button", "next", index + 1 === stages.length ? game.scoreLabel : "Continue");
          next.addEventListener("click", function () { index += 1; render(); });
          board.appendChild(next);
        });
        options.appendChild(button);
      });
      board.appendChild(options);
    }
    render();
  }
  function playMatching() {
    var pairs = (game.pairs || []).map(function (pair, i) { return { id: i, left: pair.left, right: pair.right }; });
    var rights = pairs.slice().sort(function () { return Math.random() - 0.5; });
    var chosenLeft = null, matched = {};
    function done() { return Object.keys(matched).length === pairs.length; }
    function render() {
      clear(board);
      board.appendChild(el("p", "prompt", "Find the matching trails."));
      var cols = el("div", "cols");
      var leftCol = el("div", "options");
      var rightCol = el("div", "options");
      pairs.forEach(function (pair) {
        var button = el("button", "choice" + (matched[pair.id] ? " correct" : chosenLeft === pair.id ? " picked" : ""), pair.left);
        button.disabled = !!matched[pair.id];
        button.addEventListener("click", function () { chosenLeft = pair.id; render(); });
        leftCol.appendChild(button);
      });
      rights.forEach(function (pair) {
        var used = Object.keys(matched).some(function (id) { return matched[id] === pair.id; });
        var button = el("button", "choice" + (used ? " correct" : ""), pair.right);
        button.disabled = used;
        button.addEventListener("click", function () {
          if (chosenLeft === null) return;
          if (chosenLeft === pair.id) {
            matched[pair.id] = pair.id;
            celebrate();
          }
          chosenLeft = null; render();
          if (done()) showScore(game.scoreLabel + ": " + pairs.length + " / " + pairs.length);
        });
        rightCol.appendChild(button);
      });
      cols.appendChild(leftCol); cols.appendChild(rightCol); board.appendChild(cols);
    }
    render();
  }
  function playRace() {
    var index = 0, correct = 0, locked = false;
    var rounds = game.rounds || [];
    function render() {
      locked = false; clear(board);
      if (index >= rounds.length) {
        showScore(game.scoreLabel + ": " + correct + " / " + rounds.length);
        board.appendChild(el("p", "prompt", "Signal locked."));
        celebrate();
        return;
      }
      var item = rounds[index];
      var track = el("div", "track"); var fill = el("i", "", "");
      fill.style.width = ((index / rounds.length) * 100) + "%";
      track.appendChild(fill); board.appendChild(track);
      board.appendChild(el("p", "prompt", "Round " + (index + 1) + " · " + item.prompt));
      var options = el("div", "options");
      item.options.forEach(function (option, optionIndex) {
        var button = el("button", "choice", option);
        button.addEventListener("click", function () {
          if (locked) return; locked = true;
          var ok = optionIndex === item.correctIndex;
          if (ok) { correct += 1; celebrate(); }
          button.className = "choice " + (ok ? "correct" : "wrong");
          if (!ok && options.children[item.correctIndex]) options.children[item.correctIndex].className = "choice correct";
          if (item.explanation) board.appendChild(el("p", "flavor", item.explanation));
          var next = el("button", "next", index + 1 === rounds.length ? game.scoreLabel : "Next signal");
          next.addEventListener("click", function () { index += 1; render(); });
          board.appendChild(next);
        });
        options.appendChild(button);
      });
      board.appendChild(options);
    }
    render();
  }
  if (game.kind === "adventure") playAdventure();
  else if (game.kind === "race") playRace();
  else playMatching();
})();
</script>
</body>
</html>`;
}

export function downloadGameHtml(
  game: Game,
  variantNumber: number,
  sessionNumber: number,
  scoreLabel = "Score",
) {
  saveHtmlFile(
    buildGameHtml(game, scoreLabel),
    `game_opt${variantNumber}_session${sessionNumber}.html`,
  );
}
