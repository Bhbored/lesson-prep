import type { Game } from "@/app/shared/schemas/domain";

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function embedJson(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function buildGameHtml(game: Game, scoreLabel = "Score") {
  const title = escapeHtml(game.title);
  const data = embedJson({
    title: game.title,
    kind: game.kind,
    questions: game.quiz?.questions ?? [],
    pairs: game.matching?.pairs ?? [],
    scoreLabel,
  });
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; font-family: Georgia, "Times New Roman", serif; background: #f3f6f1; color: #1d2a1b; }
  main { width: min(44rem, calc(100% - 2rem)); margin: 0 auto; padding: 2rem 0 3rem; }
  h1 { font-size: 1.75rem; line-height: 1.2; margin: 0 0 1rem; }
  .card { background: #fff; border: 1px solid #d5ddd0; border-radius: 14px; padding: 1.25rem; }
  button { font: inherit; cursor: pointer; border: 1px solid #c5d0c2; background: #fff; border-radius: 10px; min-height: 44px; padding: 0.65rem 0.9rem; text-align: start; }
  button:hover { border-color: #4d7c4a; }
  button.correct { background: #e7f3e4; border-color: #4d7c4a; }
  button.wrong { background: #fde8e8; border-color: #b42318; }
  button.picked { border-color: #2f6b32; background: #eef6ea; }
  .options, .cols { display: grid; gap: 0.6rem; }
  .cols { grid-template-columns: 1fr 1fr; }
  .status { margin: 1rem 0 0; font-weight: 700; }
  .explain { margin: 0.75rem 0 0; color: #4a5a46; }
  .row { display: flex; justify-content: space-between; gap: 1rem; align-items: center; margin-bottom: 1rem; }
</style>
</head>
<body>
<main>
  <div class="row">
    <h1>${title}</h1>
    <p id="score" class="status" hidden></p>
  </div>
  <section id="board" class="card"></section>
</main>
<script>
(function () {
  var game = ${data};
  var board = document.getElementById("board");
  var scoreEl = document.getElementById("score");
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
  }
  function playQuiz() {
    var index = 0, correct = 0, locked = false;
    var questions = game.questions || [];
    function render() {
      locked = false;
      clear(board);
      if (index >= questions.length) {
        showScore(game.scoreLabel + ": " + correct + " / " + questions.length);
        board.appendChild(el("p", "", "Finished."));
        return;
      }
      var item = questions[index];
      board.appendChild(el("p", "", (index + 1) + ". " + item.prompt));
      var options = el("div", "options");
      item.options.forEach(function (option, optionIndex) {
        var button = el("button", "", option);
        button.addEventListener("click", function () {
          if (locked) return;
          locked = true;
          var ok = optionIndex === item.correctIndex;
          if (ok) correct += 1;
          button.className = ok ? "correct" : "wrong";
          if (!ok) {
            var right = options.children[item.correctIndex];
            if (right) right.className = "correct";
          }
          if (item.explanation) board.appendChild(el("p", "explain", item.explanation));
          var next = el("button", "", index + 1 === questions.length ? "See score" : "Next");
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
      var cols = el("div", "cols");
      var leftCol = el("div", "options");
      var rightCol = el("div", "options");
      pairs.forEach(function (pair) {
        var button = el("button", matched[pair.id] ? "correct" : chosenLeft === pair.id ? "picked" : "", pair.left);
        button.disabled = !!matched[pair.id];
        button.addEventListener("click", function () { chosenLeft = pair.id; render(); });
        leftCol.appendChild(button);
      });
      rights.forEach(function (pair) {
        var used = Object.keys(matched).some(function (id) { return matched[id] === pair.id; });
        var button = el("button", used ? "correct" : "", pair.right);
        button.disabled = used;
        button.addEventListener("click", function () {
          if (chosenLeft === null) return;
          if (chosenLeft === pair.id) matched[pair.id] = pair.id;
          chosenLeft = null;
          render();
          if (done()) showScore(game.scoreLabel + ": " + pairs.length + " / " + pairs.length);
        });
        rightCol.appendChild(button);
      });
      cols.appendChild(leftCol);
      cols.appendChild(rightCol);
      board.appendChild(cols);
    }
    render();
  }
  if (game.kind === "matching") playMatching();
  else playQuiz();
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
  const html = buildGameHtml(game, scoreLabel);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `game_opt${variantNumber}_session${sessionNumber}.html`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
