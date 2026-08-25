import "./style.css";
import { attemptMove, createGame, dirLabel, requestHint, type GameState } from "./game/engine";
import { LEVELS, MAX_HEARTS } from "./game/levels";
import type { Dir } from "./game/types";
import { parseLevel } from "./game/types";
import { assertLevelsSolvable } from "./game/validate";

const STORAGE_KEY = "frecciotte-progress-v1";

type Progress = {
  unlocked: number;
  cleared: number[];
};

function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { unlocked: 1, cleared: [] };
    const parsed = JSON.parse(raw) as Progress;
    return {
      unlocked: Math.max(1, parsed.unlocked ?? 1),
      cleared: Array.isArray(parsed.cleared) ? parsed.cleared : [],
    };
  } catch {
    return { unlocked: 1, cleared: [] };
  }
}

function saveProgress(p: Progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

const app = document.querySelector<HTMLDivElement>("#app")!;

let progress = loadProgress();
let state: GameState | null = null;
let animating = false;

const arrowSvg = (dir: Dir) => {
  const rot = { N: 0, E: 90, S: 180, W: 270 }[dir];
  return `
    <svg viewBox="0 0 64 64" aria-hidden="true" style="transform: rotate(${rot}deg)">
      <path
        d="M32 10 L50 34 H40 V54 H24 V34 H14 Z"
        fill="currentColor"
      />
    </svg>
  `;
};

function renderHome() {
  state = null;
  const maxUnlocked = progress.unlocked;
  app.innerHTML = `
    <div class="shell screen-home">
      <header class="brand">
        <h1>Frecciotte</h1>
        <p>Fai uscire ogni freccia. Ordine giusto, mente libera.</p>
      </header>
      <button class="btn primary hero-play" type="button" data-action="continue">
        ${progress.cleared.length ? "Continua" : "Gioca"} · Livello ${Math.min(maxUnlocked, LEVELS.length)}
      </button>
      <div class="level-list" role="list">
        ${LEVELS.map((lvl) => {
          const locked = lvl.id > maxUnlocked;
          const done = progress.cleared.includes(lvl.id);
          return `
            <button
              class="level-item ${done ? "done" : ""} ${locked ? "locked" : ""}"
              type="button"
              data-level="${lvl.id}"
              ${locked ? "disabled" : ""}
            >
              <span class="meta">
                <strong>${lvl.id}. ${lvl.name}</strong>
                <span>${lvl.rows}×${lvl.cols} · ${countArrows(lvl.id)} frecce</span>
              </span>
              <span class="badge">${locked ? "Bloccato" : done ? "Fatto" : "Apri"}</span>
            </button>
          `;
        }).join("")}
      </div>
      <p class="help">Tocca una freccia con la via libera verso il bordo. Un errore costa un cuore.</p>
    </div>
  `;

  app.querySelector('[data-action="continue"]')?.addEventListener("click", () => {
    startLevel(Math.min(maxUnlocked, LEVELS.length));
  });

  app.querySelectorAll<HTMLButtonElement>("[data-level]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.level);
      if (!Number.isFinite(id) || id > progress.unlocked) return;
      startLevel(id);
    });
  });
}

function countArrows(levelId: number): number {
  const level = LEVELS.find((l) => l.id === levelId);
  if (!level) return 0;
  return parseLevel(level).length;
}

function startLevel(levelId: number) {
  const level = LEVELS.find((l) => l.id === levelId);
  if (!level) return;
  state = createGame(level);
  animating = false;
  renderGame();
}

function heartsHtml(hearts: number, shake = false) {
  return Array.from({ length: MAX_HEARTS }, (_, i) => {
    const empty = i >= hearts;
    return `<span class="heart ${empty ? "empty" : ""} ${shake && i === hearts ? "shake" : ""}" aria-hidden="true"></span>`;
  }).join("");
}

function renderGame(opts?: { shakeHeart?: boolean; overlay?: "won" | "lost" }) {
  if (!state) return;
  const { level, arrows, hearts, hintId, status } = state;
  const map = new Map(arrows.map((a) => [`${a.r},${a.c}`, a]));
  const showOverlay = opts?.overlay ?? (status === "won" || status === "lost" ? status : null);

  const cells: string[] = [];
  for (let r = 0; r < level.rows; r++) {
    for (let c = 0; c < level.cols; c++) {
      const arrow = map.get(`${r},${c}`);
      if (arrow) {
        const isHint = hintId === arrow.id;
        cells.push(`
          <div class="cell" data-r="${r}" data-c="${c}">
            <button
              class="arrow-btn ${isHint ? "hint" : ""}"
              type="button"
              data-id="${arrow.id}"
              aria-label="Freccia ${dirLabel(arrow.dir)}"
            >${arrowSvg(arrow.dir)}</button>
          </div>
        `);
      } else {
        cells.push(`<div class="cell" data-r="${r}" data-c="${c}"></div>`);
      }
    }
  }

  app.innerHTML = `
    <div class="shell">
      <header class="brand">
        <h1>Frecciotte</h1>
        <p>${level.name}</p>
      </header>
      <div class="hud">
        <div class="hud-level">
          <span class="label">Livello</span>
          <span class="value">${level.id} / ${LEVELS.length}</span>
        </div>
        <div class="hearts" aria-label="${hearts} cuori">
          ${heartsHtml(hearts, opts?.shakeHeart)}
        </div>
      </div>
      <div class="board-wrap ${opts?.shakeHeart ? "flash-bad" : ""}">
        <div
          class="board"
          style="grid-template-columns: repeat(${level.cols}, 1fr); grid-template-rows: repeat(${level.rows}, 1fr);"
        >
          ${cells.join("")}
        </div>
        ${
          showOverlay === "won"
            ? `<div class="overlay"><div class="overlay-card">
                <h2>Livello completo</h2>
                <p>Griglia vuota. ${state.mistakes === 0 ? "Uscita perfetta!" : `${state.mistakes} errori.`}</p>
                <button class="btn primary" type="button" data-action="next">
                  ${level.id < LEVELS.length ? "Livello successivo" : "Torna alla lista"}
                </button>
              </div></div>`
            : showOverlay === "lost"
              ? `<div class="overlay"><div class="overlay-card">
                <h2>Cuori finiti</h2>
                <p>Ricomincia e ripensa l'ordine delle frecce.</p>
                <button class="btn primary" type="button" data-action="retry">Riprova</button>
              </div></div>`
              : ""
        }
      </div>
      <div class="actions">
        <button class="btn" type="button" data-action="home">Lista</button>
        <button class="btn" type="button" data-action="hint">Suggerimento</button>
        <button class="btn primary" type="button" data-action="retry">Ricomincia</button>
      </div>
      <p class="help">Percorso libero verso il bordo? Tocca. Altrimenti perdi un cuore.</p>
    </div>
  `;

  bindGameEvents();
}

function bindGameEvents() {
  if (!state) return;

  app.querySelector('[data-action="home"]')?.addEventListener("click", () => renderHome());
  app.querySelector('[data-action="retry"]')?.addEventListener("click", () => {
    if (state) startLevel(state.level.id);
  });
  app.querySelector('[data-action="next"]')?.addEventListener("click", () => {
    if (!state) return;
    if (state.level.id < LEVELS.length) startLevel(state.level.id + 1);
    else renderHome();
  });
  app.querySelector('[data-action="hint"]')?.addEventListener("click", () => {
    if (!state || animating) return;
    requestHint(state);
    renderGame();
  });

  app.querySelectorAll<HTMLButtonElement>(".arrow-btn").forEach((btn) => {
    btn.addEventListener("click", () => onArrowTap(btn));
  });
}

async function onArrowTap(btn: HTMLButtonElement) {
  if (!state || animating || state.status !== "playing") return;
  const id = btn.dataset.id;
  if (!id) return;

  const result = attemptMove(state, id);

  if (!result.ok) {
    if (result.reason === "blocked") {
      btn.classList.add("blocked");
      renderGame({
        shakeHeart: true,
        overlay: result.status === "lost" ? "lost" : undefined,
      });
    }
    return;
  }

  animating = true;
  btn.classList.add(`leaving-${result.arrow.dir}`);
  const svg = btn.querySelector("svg");
  if (svg) {
    svg.style.transition = "transform 0.38s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.38s ease";
    svg.style.opacity = "0";
  }

  await wait(380);

  const won = state.arrows.length === 0;
  if (won) {
    state.status = "won";
    onLevelWon();
    renderGame({ overlay: "won" });
  } else {
    renderGame();
  }
  animating = false;
}

function onLevelWon() {
  if (!state) return;
  const id = state.level.id;
  if (!progress.cleared.includes(id)) {
    progress.cleared.push(id);
  }
  progress.unlocked = Math.max(progress.unlocked, Math.min(LEVELS.length, id + 1));
  saveProgress(progress);
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

const report = assertLevelsSolvable();
const bad = report.filter((r) => !r.ok);
if (bad.length) {
  console.warn("Livelli non risolvibili:", bad);
}

renderHome();

declare global {
  interface Window {
    frecciotte: {
      progress: () => Progress;
      start: (id: number) => void;
      hint: () => void;
    };
  }
}

window.frecciotte = {
  progress: () => progress,
  start: startLevel,
  hint: () => {
    if (!state) return;
    requestHint(state);
    renderGame();
  },
};
