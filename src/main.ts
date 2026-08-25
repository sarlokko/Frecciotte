import "./style.css";
import {
  createGame,
  currentLaunchable,
  fireWind,
  spinArrow,
  waitEcho,
  type GameState,
} from "./game/engine";
import type { Arrow } from "./game/types";
import { LEVELS, describeLevel } from "./game/levels";
import { hintAction } from "./game/solver";
import { assertLevelsSolvable } from "./game/validate";
import { DIR_GLYPH, key, type Dir } from "./game/types";
import { MAX_HEARTS } from "./game/engine";

const STORAGE_KEY = "frecciotte-progress-v2";

type Progress = {
  unlocked: number;
  cleared: number[];
  seenHowTo: boolean;
};

function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { unlocked: 1, cleared: [], seenHowTo: false };
    const parsed = JSON.parse(raw) as Progress;
    return {
      unlocked: Math.max(1, parsed.unlocked ?? 1),
      cleared: Array.isArray(parsed.cleared) ? parsed.cleared : [],
      seenHowTo: Boolean(parsed.seenHowTo),
    };
  } catch {
    return { unlocked: 1, cleared: [], seenHowTo: false };
  }
}

function saveProgress(p: Progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

const app = document.querySelector<HTMLDivElement>("#app")!;
let progress = loadProgress();
let state: GameState | null = null;
let animating = false;
let toast: string | null = null;
let screen: "home" | "howto" | "play" = progress.seenHowTo ? "home" : "howto";

function buzz(ms = 18) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* ignore */
  }
}

const arrowSvg = (dir: Dir, spin: boolean) => {
  const rot = { N: 0, E: 90, S: 180, W: 270 }[dir];
  return `
    <svg viewBox="0 0 64 64" aria-hidden="true" style="transform: rotate(${rot}deg)">
      ${spin ? `<circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="6 5" opacity="0.9"/>` : ""}
      <path d="M32 8 L52 34 H40 V56 H24 V34 H12 Z" fill="currentColor"/>
    </svg>
  `;
};

function render() {
  if (screen === "howto") return renderHowTo();
  if (screen === "home" || !state) return renderHome();
  return renderGame();
}

function renderHowTo() {
  app.innerHTML = `
    <div class="shell howto">
      <header class="brand">
        <p class="kicker">Nuovo rompicapo</p>
        <h1>Frecciotte</h1>
        <p>Non è un clone: qui comandi il vento.</p>
      </header>
      <ol class="lessons">
        <li>
          <strong>Stormo</strong>
          <span>Scorri o tocca un tasto direzione. Partono tutte le frecce libere di quel vento.</span>
        </li>
        <li>
          <strong>Eco</strong>
          <span>Ogni volo lascia un'eco per un turno. L'eco occupa la cella: a volte devi attendere.</span>
        </li>
        <li>
          <strong>Girevoli</strong>
          <span>Le frecce con l'anello d'oro ruotano. Toccale, poi lancia il vento giusto.</span>
        </li>
        <li>
          <strong>Portali</strong>
          <span>Due anelli gemelli piegano il volo dall'altra parte della piazza.</span>
        </li>
      </ol>
      <button class="btn primary hero-play" type="button" data-action="start">Gioca dal telefono</button>
    </div>
  `;
  app.querySelector('[data-action="start"]')?.addEventListener("click", () => {
    progress.seenHowTo = true;
    saveProgress(progress);
    screen = "home";
    render();
  });
}

function renderHome() {
  const maxUnlocked = progress.unlocked;
  app.innerHTML = `
    <div class="shell screen-home">
      <header class="brand">
        <p class="kicker">Rompicapo dei venti</p>
        <h1>Frecciotte</h1>
        <p>Stormi, echi, girevoli. Svuota la piazza.</p>
      </header>
      <button class="btn primary hero-play" type="button" data-action="continue">
        ${progress.cleared.length ? "Continua" : "Inizia"} · Livello ${Math.min(maxUnlocked, LEVELS.length)}
      </button>
      <div class="level-list" role="list">
        ${LEVELS.map((lvl) => {
          const locked = lvl.id > maxUnlocked;
          const done = progress.cleared.includes(lvl.id);
          const meta = describeLevel(lvl);
          return `
            <button
              class="level-item ${done ? "done" : ""} ${locked ? "locked" : ""}"
              type="button"
              data-level="${lvl.id}"
              ${locked ? "disabled" : ""}
            >
              <span class="meta">
                <strong>${lvl.id}. ${lvl.name}</strong>
                <span>${lvl.rows}×${lvl.cols} · ${meta.arrows} frecce${meta.spins ? ` · ${meta.spins} girevoli` : ""}</span>
              </span>
              <span class="badge">${locked ? "Bloccato" : done ? "Fatto" : "Apri"}</span>
            </button>
          `;
        }).join("")}
      </div>
      <button class="btn ghost" type="button" data-action="howto">Come si gioca</button>
    </div>
  `;

  app.querySelector('[data-action="continue"]')?.addEventListener("click", () => {
    startLevel(Math.min(maxUnlocked, LEVELS.length));
  });
  app.querySelector('[data-action="howto"]')?.addEventListener("click", () => {
    screen = "howto";
    render();
  });
  app.querySelectorAll<HTMLButtonElement>("[data-level]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.level);
      if (!Number.isFinite(id) || id > progress.unlocked) return;
      startLevel(id);
    });
  });
}

function startLevel(levelId: number) {
  const level = LEVELS.find((l) => l.id === levelId);
  if (!level) return;
  state = createGame(level);
  animating = false;
  toast = null;
  screen = "play";
  renderGame();
}

function heartsHtml(hearts: number, shake = false) {
  return Array.from({ length: MAX_HEARTS }, (_, i) => {
    const empty = i >= hearts;
    return `<span class="heart ${empty ? "empty" : ""} ${shake && i === hearts ? "shake" : ""}"></span>`;
  }).join("");
}

function renderGame(opts?: {
  shakeHeart?: boolean;
  overlay?: "won" | "lost";
  leavingArrows?: Arrow[];
}) {
  if (!state) return;
  const { level, arrows, hearts, status, board, ecos, combo, hint } = state;
  const map = new Map(arrows.map((a) => [key(a.r, a.c), a]));
  for (const a of opts?.leavingArrows ?? []) map.set(key(a.r, a.c), a);
  const ecoKeys = new Set(ecos.map((e) => key(e.r, e.c)));
  const showOverlay = opts?.overlay ?? (status === "won" || status === "lost" ? status : null);
  const leaving = new Set((opts?.leavingArrows ?? []).map((a) => a.id));
  const hintIds = new Set<string>();
  if (hint?.kind === "wind") {
    for (const a of currentLaunchable(state, hint.dir)) hintIds.add(a.id);
  }
  if (hint?.kind === "spin") hintIds.add(hint.id);

  const cells: string[] = [];
  for (let r = 0; r < level.rows; r++) {
    for (let c = 0; c < level.cols; c++) {
      const k = key(r, c);
      const arrow = map.get(k);
      const wall = board.walls.has(k);
      const portal = board.portalIndex.has(k);
      const eco = ecoKeys.has(k);
      const classes = [
        "cell",
        wall ? "wall" : "",
        portal ? "portal" : "",
        eco ? "eco" : "",
      ]
        .filter(Boolean)
        .join(" ");

      if (arrow) {
        const leaveClass = leaving.has(arrow.id) ? `leaving-${arrow.dir}` : "";
        cells.push(`
          <div class="${classes}" data-r="${r}" data-c="${c}">
            <button
              class="arrow-btn ${arrow.spin ? "spin" : ""} ${hintIds.has(arrow.id) ? "hint" : ""} ${leaveClass}"
              type="button"
              data-id="${arrow.id}"
              data-spin="${arrow.spin ? "1" : "0"}"
              data-dir="${arrow.dir}"
              aria-label="${arrow.spin ? "Girevole" : "Freccia"} ${DIR_GLYPH[arrow.dir]}"
            >${arrowSvg(arrow.dir, arrow.spin)}</button>
          </div>
        `);
      } else {
        cells.push(`<div class="${classes}" data-r="${r}" data-c="${c}">${portal ? '<span class="portal-ring"></span>' : ""}</div>`);
      }
    }
  }

  const hintWait = hint?.kind === "wait";
  const stars =
    state.mistakes === 0 && state.maxCombo >= 2 ? 3 : state.mistakes === 0 ? 2 : 1;

  app.innerHTML = `
    <div class="shell play">
      <header class="brand compact">
        <h1>Frecciotte</h1>
        <p>${level.name}</p>
      </header>
      <div class="hud">
        <div class="hud-level">
          <span class="label">Livello ${level.id}/${LEVELS.length}</span>
          <span class="value">${combo > 1 ? `Stormo ×${combo}` : "Vento fermo"}</span>
        </div>
        <div class="hearts" aria-label="${hearts} cuori">${heartsHtml(hearts, opts?.shakeHeart)}</div>
      </div>
      <p class="lesson">${level.lesson}</p>
      <div class="board-wrap ${opts?.shakeHeart ? "flash-bad" : ""}">
        <div
          class="board"
          style="grid-template-columns: repeat(${level.cols}, 1fr); grid-template-rows: repeat(${level.rows}, 1fr); aspect-ratio: ${level.cols} / ${level.rows};"
        >
          ${cells.join("")}
        </div>
        ${toast ? `<div class="toast">${toast}</div>` : ""}
        ${
          showOverlay === "won"
            ? `<div class="overlay"><div class="overlay-card">
                <h2>Piazza vuota</h2>
                <p class="stars">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</p>
                <p>${state.mistakes === 0 ? "Nessun vento sbagliato." : `${state.mistakes} venti vuoti.`}</p>
                <button class="btn primary" type="button" data-action="next">
                  ${level.id < LEVELS.length ? "Livello successivo" : "Torna alla lista"}
                </button>
              </div></div>`
            : showOverlay === "lost"
              ? `<div class="overlay"><div class="overlay-card">
                <h2>Venti spezzati</h2>
                <p>I cuori sono finiti. Riprova la piazza.</p>
                <button class="btn primary" type="button" data-action="retry">Riprova</button>
              </div></div>`
              : ""
        }
      </div>
      <div class="winds" aria-label="Venti">
        <button class="btn wind" data-wind="N" type="button">${DIR_GLYPH.N}<small>Nord</small></button>
        <button class="btn wind" data-wind="W" type="button">${DIR_GLYPH.W}<small>Ovest</small></button>
        <button class="btn wind" data-wind="E" type="button">${DIR_GLYPH.E}<small>Est</small></button>
        <button class="btn wind" data-wind="S" type="button">${DIR_GLYPH.S}<small>Sud</small></button>
      </div>
      <div class="actions">
        <button class="btn" type="button" data-action="home">Lista</button>
        <button class="btn ${hintWait ? "hinted" : ""}" type="button" data-action="wait" ${state.ecos.length === 0 ? "disabled" : ""}>Attendi</button>
        <button class="btn" type="button" data-action="hint">Aiuto</button>
        <button class="btn primary" type="button" data-action="retry">Reset</button>
      </div>
    </div>
  `;

  bindGameEvents();
}

function bindGameEvents() {
  if (!state) return;

  app.querySelector('[data-action="home"]')?.addEventListener("click", () => {
    screen = "home";
    state = null;
    render();
  });
  app.querySelector('[data-action="retry"]')?.addEventListener("click", () => {
    if (state) startLevel(state.level.id);
  });
  app.querySelector('[data-action="next"]')?.addEventListener("click", () => {
    if (!state) return;
    if (state.level.id < LEVELS.length) startLevel(state.level.id + 1);
    else {
      screen = "home";
      state = null;
      render();
    }
  });
  app.querySelector('[data-action="wait"]')?.addEventListener("click", () => {
    if (!state || animating) return;
    if (waitEcho(state)) {
      toast = "L'eco svanisce";
      buzz(12);
      renderGame();
    }
  });
  app.querySelector('[data-action="hint"]')?.addEventListener("click", () => {
    if (!state || animating) return;
    const action = hintAction(state);
    state.hint = action;
    if (!action) toast = "Nessun aiuto";
    else if (action.kind === "wait") toast = "Attendi che l'eco svanisca";
    else if (action.kind === "spin") toast = "Tocca una girevole per ruotarla";
    else toast = `Lancia il vento ${DIR_GLYPH[action.dir]}`;
    renderGame();
  });

  app.querySelectorAll<HTMLButtonElement>("[data-wind]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = btn.dataset.wind as Dir;
      void onWind(dir);
    });
  });

  const wrap = app.querySelector(".board-wrap");
  if (wrap) bindSwipe(wrap);
  bindArrowPresses();
}

function bindSwipe(wrap: Element) {
  let x0 = 0;
  let y0 = 0;
  wrap.addEventListener("pointerdown", (ev) => {
    const e = ev as PointerEvent;
    x0 = e.clientX;
    y0 = e.clientY;
  });
  wrap.addEventListener("pointerup", (ev) => {
    const e = ev as PointerEvent;
    const dx = e.clientX - x0;
    const dy = e.clientY - y0;
    if (Math.hypot(dx, dy) < 42) return;
    if (Math.abs(dx) > Math.abs(dy)) void onWind(dx > 0 ? "E" : "W");
    else void onWind(dy > 0 ? "S" : "N");
  });
}

function bindArrowPresses() {
  app.querySelectorAll<HTMLButtonElement>(".arrow-btn").forEach((btn) => {
    let timer: number | null = null;
    let rotated = false;

    const clear = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };

    btn.addEventListener("pointerdown", (ev) => {
      ev.stopPropagation();
      rotated = false;
      if (btn.dataset.spin !== "1") return;
      timer = window.setTimeout(() => {
        rotated = true;
        if (!state) return;
        const id = btn.dataset.id;
        if (!id) return;
        if (spinArrow(state, id)) {
          buzz(24);
          toast = "Girevole ruotata";
          renderGame();
        }
      }, 420);
    });
    btn.addEventListener("pointerup", (ev) => {
      ev.stopPropagation();
      clear();
      if (rotated || animating || !state) return;
      const id = btn.dataset.id;
      if (btn.dataset.spin === "1" && id) {
        if (spinArrow(state, id)) {
          buzz(24);
          toast = "Girevole ruotata";
          renderGame();
        }
        return;
      }
      const dir = btn.dataset.dir as Dir | undefined;
      if (dir) void onWind(dir);
    });
    btn.addEventListener("pointerleave", clear);
    btn.addEventListener("pointercancel", clear);
  });
}

async function onWind(dir: Dir) {
  if (!state || animating || state.status !== "playing") return;
  const result = fireWind(state, dir);

  if (!result.ok) {
    buzz(40);
    toast = "Vento vuoto";
    renderGame({
      shakeHeart: true,
      overlay: result.status === "lost" ? "lost" : undefined,
    });
    return;
  }

  animating = true;
  buzz(result.stormo ? 28 : 14);
  toast = result.stormo ? `Stormo ×${result.launched.length}` : "Via!";
  renderGame({ leavingArrows: result.launched });
  await wait(360);

  if (result.won) {
    onLevelWon();
    toast = null;
    renderGame({ overlay: "won" });
  } else {
    renderGame();
  }
  animating = false;
}

function onLevelWon() {
  if (!state) return;
  const id = state.level.id;
  if (!progress.cleared.includes(id)) progress.cleared.push(id);
  progress.unlocked = Math.max(progress.unlocked, Math.min(LEVELS.length, id + 1));
  saveProgress(progress);
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

const report = assertLevelsSolvable();
const bad = report.filter((r) => !r.ok);
if (bad.length) console.warn("Livelli non risolvibili:", bad);

render();

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  void navigator.serviceWorker.register("./sw.js");
}

declare global {
  interface Window {
    frecciotte: { start: (id: number) => void };
  }
}

window.frecciotte = { start: startLevel };
