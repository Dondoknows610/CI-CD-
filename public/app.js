const app = document.getElementById("app");
const bankMeta = document.getElementById("bankMeta");

const state = {
  bank: [],
  size: 25,
  mode: "practice", // practice | exam
  shuffle: true,
  queue: [],
  index: 0,
  answers: {}, // questionId -> selected key
  revealed: false,
};

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function setChipSelection(container, value) {
  container.querySelectorAll(".chip").forEach((chip) => {
    chip.setAttribute("aria-pressed", String(chip.dataset.value === value));
  });
}

function renderHome() {
  app.innerHTML = `
    <section class="screen hero" aria-labelledby="brand-hero">
      <p class="brand-hero" id="brand-hero">CISSP Drill</p>
      <h2>Sharpen your security judgment one question at a time.</h2>
      <p class="lede">
        Work through multiple-choice CISSP practice items with progress tracking,
        keyboard shortcuts, and a clear end-of-set review.
      </p>

      <div class="panel controls">
        <div class="control-group">
          <label id="size-label">Quiz length</label>
          <div class="chip-row" role="group" aria-labelledby="size-label" data-control="size">
            ${[10, 25, 50, "all"]
              .map(
                (value) => `
              <button type="button" class="chip" data-value="${value}" aria-pressed="${
                  String(state.size) === String(value)
                }">${value === "all" ? "All" : value}</button>`
              )
              .join("")}
          </div>
        </div>

        <div class="control-group">
          <label id="mode-label">Mode</label>
          <div class="chip-row" role="group" aria-labelledby="mode-label" data-control="mode">
            <button type="button" class="chip" data-value="practice" aria-pressed="${
              state.mode === "practice"
            }">Practice (instant feedback)</button>
            <button type="button" class="chip" data-value="exam" aria-pressed="${
              state.mode === "exam"
            }">Exam (score at end)</button>
          </div>
        </div>

        <div class="control-group">
          <label id="order-label">Order</label>
          <div class="chip-row" role="group" aria-labelledby="order-label" data-control="shuffle">
            <button type="button" class="chip" data-value="true" aria-pressed="${
              state.shuffle
            }">Shuffled</button>
            <button type="button" class="chip" data-value="false" aria-pressed="${
              !state.shuffle
            }">Original order</button>
          </div>
        </div>

        <div class="btn-row">
          <button type="button" class="btn btn-primary" id="startQuiz">Start quiz</button>
        </div>
      </div>
    </section>
  `;

  app.querySelectorAll("[data-control]").forEach((group) => {
    group.addEventListener("click", (event) => {
      const chip = event.target.closest(".chip");
      if (!chip) return;
      const control = group.dataset.control;
      const value = chip.dataset.value;

      if (control === "size") {
        state.size = value === "all" ? "all" : Number(value);
      } else if (control === "mode") {
        state.mode = value;
      } else if (control === "shuffle") {
        state.shuffle = value === "true";
      }

      setChipSelection(group, value);
    });
  });

  document.getElementById("startQuiz").addEventListener("click", startQuiz);
}

function startQuiz() {
  const ordered = state.shuffle ? shuffle(state.bank) : [...state.bank];
  const count = state.size === "all" ? ordered.length : Math.min(state.size, ordered.length);
  state.queue = ordered.slice(0, count);
  state.index = 0;
  state.answers = {};
  state.revealed = false;
  renderQuestion();
}

function currentQuestion() {
  return state.queue[state.index];
}

function answeredCount() {
  return Object.keys(state.answers).length;
}

function renderQuestion() {
  const q = currentQuestion();
  const selected = state.answers[q.id] || null;
  const progress = ((state.index + 1) / state.queue.length) * 100;
  const showFeedback = state.mode === "practice" && state.revealed && selected;

  app.innerHTML = `
    <section class="screen" aria-labelledby="question-text">
      <div class="quiz-head">
        <div class="progress-meta">
          <strong>Question ${state.index + 1} / ${state.queue.length}</strong>
          <span>${answeredCount()} answered · ${
            state.mode === "practice" ? "Practice" : "Exam"
          }</span>
        </div>
        <div class="progress-track" aria-hidden="true">
          <div class="progress-fill" style="width:${progress}%"></div>
        </div>
      </div>

      <article class="panel question-card">
        <p class="question-kicker">Item ${q.id}</p>
        <h2 class="question-text" id="question-text">${escapeHtml(q.question)}</h2>

        <div class="options" role="listbox" aria-label="Answer choices">
          ${q.options
            .map((option) => {
              let cls = "option";
              if (selected === option.key) cls += " selected";
              if (showFeedback) {
                if (option.key === q.answer) cls += " correct";
                else if (selected === option.key) cls += " incorrect";
              }
              return `
                <button
                  type="button"
                  class="${cls}"
                  data-key="${option.key}"
                  role="option"
                  aria-selected="${selected === option.key}"
                  ${showFeedback ? "disabled" : ""}
                >
                  <span class="option-key">${option.key}</span>
                  <span>${escapeHtml(option.text)}</span>
                </button>
              `;
            })
            .join("")}
        </div>

        ${
          showFeedback
            ? `<p class="feedback ${
                selected === q.answer ? "ok" : "bad"
              }">${
                selected === q.answer
                  ? "Correct."
                  : `Incorrect. The right answer is ${q.answer}.`
              }</p>`
            : ""
        }

        <div class="btn-row">
          <button type="button" class="btn btn-ghost" id="quitQuiz">Quit</button>
          ${
            state.index > 0
              ? `<button type="button" class="btn btn-ghost" id="prevQuestion">Previous</button>`
              : ""
          }
          <button type="button" class="btn btn-primary" id="nextQuestion" ${
            selected ? "" : "disabled"
          }>
            ${state.index === state.queue.length - 1 ? "Finish" : "Next"}
          </button>
        </div>
        <p class="muted">Tip: press A–D to choose an answer, Enter for next.</p>
      </article>
    </section>
  `;

  app.querySelectorAll(".option").forEach((button) => {
    button.addEventListener("click", () => selectAnswer(button.dataset.key));
  });

  document.getElementById("quitQuiz").addEventListener("click", renderHome);
  document.getElementById("nextQuestion").addEventListener("click", goNext);
  const prev = document.getElementById("prevQuestion");
  if (prev) prev.addEventListener("click", goPrev);
}

function selectAnswer(key) {
  const q = currentQuestion();
  if (state.mode === "practice" && state.revealed) return;

  state.answers[q.id] = key;
  if (state.mode === "practice") {
    state.revealed = true;
  }
  renderQuestion();
}

function goNext() {
  const q = currentQuestion();
  if (!state.answers[q.id]) return;

  if (state.index >= state.queue.length - 1) {
    renderResults();
    return;
  }

  state.index += 1;
  const next = currentQuestion();
  state.revealed = Boolean(state.answers[next.id]) && state.mode === "practice";
  renderQuestion();
}

function goPrev() {
  if (state.index === 0) return;
  state.index -= 1;
  const prev = currentQuestion();
  state.revealed = Boolean(state.answers[prev.id]) && state.mode === "practice";
  renderQuestion();
}

function scoreQuiz() {
  let correct = 0;
  const missed = [];

  for (const question of state.queue) {
    const selected = state.answers[question.id];
    if (selected === question.answer) {
      correct += 1;
    } else {
      missed.push({
        ...question,
        selected: selected || "—",
      });
    }
  }

  return {
    correct,
    total: state.queue.length,
    percent: Math.round((correct / state.queue.length) * 100),
    missed,
  };
}

function renderResults() {
  const result = scoreQuiz();

  app.innerHTML = `
    <section class="screen results" aria-labelledby="results-title">
      <div class="panel score-ring-wrap">
        <div class="score-ring" style="--pct:${result.percent}">
          <strong>${result.percent}%</strong>
        </div>
        <h2 id="results-title" style="margin:0;font-family:var(--font-display);letter-spacing:-0.03em;">
          ${result.correct} of ${result.total} correct
        </h2>
        <p class="lede" style="text-align:center;">
          ${
            result.percent >= 70
              ? "Solid pass-line performance. Keep drilling the misses."
              : "Keep going — review the misses below and run another set."
          }
        </p>
        <div class="btn-row">
          <button type="button" class="btn btn-primary" id="retryQuiz">New quiz</button>
          <button type="button" class="btn btn-ghost" id="homeQuiz">Back to start</button>
        </div>
      </div>

      ${
        result.missed.length
          ? `
        <div>
          <h3 style="font-family:var(--font-display);letter-spacing:-0.02em;">Review misses</h3>
          <div class="review-list">
            ${result.missed
              .map((item) => {
                const selectedText =
                  item.options.find((o) => o.key === item.selected)?.text || "No answer";
                const correctText = item.options.find((o) => o.key === item.answer)?.text || "";
                return `
                  <article class="review-item">
                    <h3>Item ${item.id}</h3>
                    <p>${escapeHtml(item.question)}</p>
                    <p class="your">Your answer (${escapeHtml(item.selected)}): ${escapeHtml(
                      selectedText
                    )}</p>
                    <p class="right">Correct (${item.answer}): ${escapeHtml(correctText)}</p>
                  </article>
                `;
              })
              .join("")}
          </div>
        </div>`
          : `<p class="panel">Perfect set — no misses to review.</p>`
      }
    </section>
  `;

  document.getElementById("retryQuiz").addEventListener("click", startQuiz);
  document.getElementById("homeQuiz").addEventListener("click", renderHome);
}

function onKeydown(event) {
  if (!state.queue.length) return;
  const key = event.key.toUpperCase();
  if (["A", "B", "C", "D"].includes(key)) {
    event.preventDefault();
    selectAnswer(key);
  } else if (event.key === "Enter") {
    const q = currentQuestion();
    if (q && state.answers[q.id]) {
      event.preventDefault();
      goNext();
    }
  }
}

async function init() {
  try {
    const response = await fetch("./questions.json");
    if (!response.ok) throw new Error(`Failed to load questions (${response.status})`);
    state.bank = await response.json();
    bankMeta.textContent = `${state.bank.length} practice questions ready`;
    renderHome();
  } catch (error) {
    bankMeta.textContent = "Question bank unavailable";
    app.innerHTML = `<p class="error">Could not load the quiz data. ${escapeHtml(
      error.message
    )}</p>`;
  }
}

window.addEventListener("keydown", onKeydown);
init();
