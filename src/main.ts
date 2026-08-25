import "./style.css";
import {
  canWait,
  createGame,
  launchArrow,
  spinArrow,
  waitTurn,
  type GameState,
} from "./game/engine";
import type { Arrow, Residue } from "./game/types";
import { DIR_GLYPH, key, type Dir } from "./game/types";
import { MAX_HEARTS } from "./game/engine";
import { findLevel, LEVELS, levelsInWorld, nextLevel } from "./game/levels";
import { hintAction } from "./game/solver";
import { WORLDS, worldById } from "./game/worlds";

const STORAGE_KEY = "frecciotte-progress-v3";

type Progress = {
  seenHowTo: boolean;
  lastUid: string;
  cleared: string[];
};

function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { seenHowTo: false, lastUid: "eco-1", cleared: [] };
    const p = JSON.parse(raw) as Progress;
    return {
      seenHowTo: Boolean(p.seenHowTo),
      lastUid: typeof p.lastUid === "string" ? p.lastUid : "eco-1",
      cleared: Array.isArray(p.cleared) ? p.cleared : [],
    };
  } catch {
    return { seenHowTo: false, lastUid: "eco-1", cleared: [] };
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

const app = document.querySelector<HTMLDivElement>("#app")!;
let progress = loadProgress();
let state: GameState | null = null;
let animating = false;
let toast: string | null = null;
let screen: "howto" | "worlds" | "list" | "play" = progress.seenHowTo ? "worlds" : "howto";
let openWorld = worldById(findLevel(progress.lastUid)?.world ?? "eco").id;

function buzz(ms = 16) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* ignore */
  }
}

function worldUnlocked(worldId: string): boolean {
  const idx = WORLDS.findIndex((w) => w.id === worldId);
  if (idx <= 0) return true;
  const prev = WORLDS[idx - 1]!;
  return levelsInWorld(prev.id).every((l) => progress.cleared.includes(l.uid));
}

function stageUnlocked(level: { world: string; stage: number; uid: string }): boolean {
  if (!worldUnlocked(level.world)) return false;
  if (level.stage === 1) return true;
  const prev = levelsInWorld(level.world).find((l) => l.stage === level.stage - 1);
  return Boolean(prev && progress.cleared.includes(prev.uid));
}

function continueLevel() {
  const last = findLevel(progress.lastUid);
  if (last && !progress.cleared.includes(last.uid) && stageUnlocked(last)) return last;
  for (const w of WORLDS) {
    if (!worldUnlocked(w.id)) break;
    for (const l of levelsInWorld(w.id)) {
      if (!progress.cleared.includes(l.uid) && stageUnlocked(l)) return l;
    }
  }
  return LEVELS[0]!;
}

const arrowSvg = (dir: Dir, kind: Arrow["kind"]) => {
  const rot = { N: 0, E: 90, S: 180, W: 270 }[dir];
  const colorClass = kind === "root" ? "root" : kind === "spin" ? "spin" : "";
  return `
    <svg class="${colorClass}" viewBox="0 0 64 64" aria-hidden="true" style="transform: rotate(${rot}deg)">
      ${kind === "spin" ? `<circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="6 5"/>` : ""}
      ${kind === "root" ? `<circle cx="32" cy="38" r="7" fill="currentColor" opacity="0.45"/>` : ""}
      <path d="M32 8 L52 34 H40 V56 H24 V34 H12 Z" fill="currentColor"/>
    </svg>
  `;
};

function render() {
  if (screen === "howto") return renderHowTo();
  if (screen === "list") return renderList();
  if (screen === "play" && state) return renderGame();
  return renderWorlds();
}

function renderHowTo() {
  app.innerHTML = `
    <div class="shell howto">
      <header class="brand">
        <p class="kicker">Rompicapo</p>
        <h1>Frecciotte</h1>
        <p>Tocca. L'eco resta. Le mosse no.</p>
      </header>
      <ol class="lessons">
        <li>
          <strong>Tocca una freccia</strong>
          <span>Parte solo se ha la via libera fino al bordo. Un tocco sbagliato costa un cuore.</span>
        </li>
        <li>
          <strong>L'eco occupa</strong>
          <span>Dopo il volo la cella resta piena. Attendi per farla sbiadire — costa una mossa.</span>
        </li>
        <li>
          <strong>Limite di mosse</strong>
          <span>Ogni volo e ogni attesa contano. Svuota la piazza prima che finiscano.</span>
        </li>
      </ol>
      <button class="btn primary hero-play" type="button" data-action="start">Gioca</button>
    </div>
  `;
  app.querySelector('[data-action="start"]')?.addEventListener("click", () => {
    progress.seenHowTo = true;
    saveProgress();
    screen = "worlds";
    render();
  });
}

function renderWorlds() {
  const cont = continueLevel();
  app.innerHTML = `
    <div class="shell screen-home">
      <header class="brand">
        <p class="kicker">Sette piazze</p>
        <h1>Frecciotte</h1>
        <p>Un mondo lineare, poi altri sei. Sempre più grandi.</p>
      </header>
      <button class="btn primary hero-play" type="button" data-action="continue">
        Continua · ${worldById(cont.world).name} ${cont.stage}
      </button>
      <div class="world-list">
        ${WORLDS.map((w) => {
          const levels = levelsInWorld(w.id);
          const done = levels.filter((l) => progress.cleared.includes(l.uid)).length;
          const locked = !worldUnlocked(w.id);
          return `
            <button class="world-card ${locked ? "locked" : ""} ${done === 15 ? "done" : ""}" type="button" data-world="${w.id}" ${locked ? "disabled" : ""}>
              <span class="tag">${w.tag}</span>
              <strong>${w.name}</strong>
              <span class="blurb">${locked ? "Completa il mondo precedente" : w.blurb}</span>
              <span class="prog">${done}/15</span>
            </button>
          `;
        }).join("")}
      </div>
      <button class="btn ghost" type="button" data-action="howto">Come si gioca</button>
    </div>
  `;
  app.querySelector('[data-action="continue"]')?.addEventListener("click", () => startLevel(cont.uid));
  app.querySelector('[data-action="howto"]')?.addEventListener("click", () => {
    screen = "howto";
    render();
  });
  app.querySelectorAll<HTMLButtonElement>("[data-world]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openWorld = btn.dataset.world ?? "eco";
      screen = "list";
      render();
    });
  });
}

function renderList() {
  const w = worldById(openWorld);
  const levels = levelsInWorld(openWorld);
  app.innerHTML = `
    <div class="shell screen-home">
      <header class="brand">
        <p class="kicker">${w.tag}</p>
        <h1>${w.name}</h1>
        <p>${w.blurb}</p>
      </header>
      <div class="level-list">
        ${levels.map((lvl) => {
          const locked = !stageUnlocked(lvl);
          const done = progress.cleared.includes(lvl.uid);
          return `
            <button class="level-item ${done ? "done" : ""} ${locked ? "locked" : ""}" type="button" data-uid="${lvl.uid}" ${locked ? "disabled" : ""}>
              <span class="meta">
                <strong>${lvl.stage}. ${lvl.name}</strong>
                <span>${lvl.rows}×${lvl.cols} · ${lvl.moveLimit} mosse</span>
              </span>
              <span class="badge">${locked ? "Bloccato" : done ? "Fatto" : "Apri"}</span>
            </button>
          `;
        }).join("")}
      </div>
      <button class="btn ghost" type="button" data-action="worlds">I mondi</button>
    </div>
  `;
  app.querySelector('[data-action="worlds"]')?.addEventListener("click", () => {
    screen = "worlds";
    render();
  });
  app.querySelectorAll<HTMLButtonElement>("[data-uid]").forEach((btn) => {
    btn.addEventListener("click", () => startLevel(btn.dataset.uid ?? ""));
  });
}

function startLevel(uid: string) {
  const level = findLevel(uid);
  if (!level) return;
  progress.lastUid = uid;
  saveProgress();
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

function residueClass(res: Residue | undefined): string {
  if (!res) return "";
  if (res.style === "root") return "res-root";
  if (res.style === "smoke") return "res-smoke";
  if (res.style === "trail") return "res-trail";
  if (res.style === "dew") return "res-dew";
  return "res-echo";
}

function renderGame(opts?: { shakeHeart?: boolean; overlay?: "won" | "lost"; leavingArrows?: Arrow[] }) {
  if (!state) return;
  const { level, arrows, hearts, status, board, residues, movesLeft, hint } = state;
  const map = new Map(arrows.map((a) => [key(a.r, a.c), a]));
  for (const a of opts?.leavingArrows ?? []) map.set(key(a.r, a.c), a);
  const resMap = new Map(residues.map((e) => [key(e.r, e.c), e]));
  const showOverlay = opts?.overlay ?? (status === "won" || status === "lost" ? status : null);
  const leaving = new Set((opts?.leavingArrows ?? []).map((a) => a.id));
  const hintAt = hint && hint.kind !== "wait" ? hint.at : "";

  const cells: string[] = [];
  for (let r = 0; r < level.rows; r++) {
    for (let c = 0; c < level.cols; c++) {
      const k = key(r, c);
      const arrow = map.get(k);
      const res = resMap.get(k);
      const wall = board.walls.has(k);
      const portal = board.portalIndex.has(k);
      const classes = ["cell", wall ? "wall" : "", portal ? "portal" : "", residueClass(res)]
        .filter(Boolean)
        .join(" ");
      const ttl = res && res.ttl > 0 ? `<span class="ttl">${res.ttl}</span>` : "";
      if (arrow) {
        cells.push(`
          <div class="${classes}" data-r="${r}" data-c="${c}">
            ${ttl}
            <button class="arrow-btn ${arrow.kind} ${hintAt === k ? "hint" : ""} ${leaving.has(arrow.id) ? `leaving-${arrow.dir}` : ""}" type="button" data-id="${arrow.id}" aria-label="Freccia ${DIR_GLYPH[arrow.dir]}">
              ${arrowSvg(arrow.dir, arrow.kind)}
            </button>
            ${arrow.kind === "spin" ? `<button class="spin-badge" type="button" data-spin="${arrow.id}" aria-label="Ruota">↻</button>` : ""}
          </div>
        `);
      } else {
        cells.push(
          `<div class="${classes}" data-r="${r}" data-c="${c}">${ttl}${portal ? '<span class="portal-ring"></span>' : ""}</div>`,
        );
      }
    }
  }

  const w = worldById(level.world);
  const stars = state.movesLeft >= 2 ? 3 : state.movesLeft >= 1 ? 2 : 1;
  const lostMsg =
    state.loseReason === "moves" ? "Mosse finite. Riprova con un ordine più pulito." : "Cuori finiti. Un tocco sbagliato costa caro.";

  app.innerHTML = `
    <div class="shell play">
      <header class="brand compact">
        <h1>${w.name}</h1>
        <p>${level.stage}. ${level.name}</p>
      </header>
      <div class="hud">
        <div class="hud-level">
          <span class="label">Mosse</span>
          <span class="value moves ${movesLeft <= 2 ? "low" : ""}">${movesLeft}</span>
        </div>
        <div class="hearts" aria-label="${hearts} cuori">${heartsHtml(hearts, opts?.shakeHeart)}</div>
      </div>
      <p class="lesson">${level.lesson}</p>
      <div class="board-wrap ${opts?.shakeHeart ? "flash-bad" : ""}">
        <div class="board-scroll">
          <div class="board" style="grid-template-columns: repeat(${level.cols}, minmax(26px, 1fr)); grid-template-rows: repeat(${level.rows}, minmax(26px, 1fr)); aspect-ratio: ${level.cols} / ${level.rows};">
            ${cells.join("")}
          </div>
        </div>
        ${toast ? `<div class="toast">${toast}</div>` : ""}
        ${
          showOverlay === "won"
            ? `<div class="overlay"><div class="overlay-card">
                <h2>Piazza vuota</h2>
                <p class="stars">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</p>
                <p>${state.movesLeft} mosse avanzate · ${state.mistakes} errori</p>
                <button class="btn primary" type="button" data-action="next">Avanti</button>
              </div></div>`
            : showOverlay === "lost"
              ? `<div class="overlay"><div class="overlay-card">
                <h2>Niente più mosse</h2>
                <p>${lostMsg}</p>
                <button class="btn primary" type="button" data-action="retry">Riprova</button>
              </div></div>`
              : ""
        }
      </div>
      <div class="actions four">
        <button class="btn" type="button" data-action="list">Livelli</button>
        <button class="btn ${hint?.kind === "wait" ? "hinted" : ""}" type="button" data-action="wait" ${canWait(state) ? "" : "disabled"}>Attendi</button>
        <button class="btn" type="button" data-action="hint">Aiuto</button>
        <button class="btn primary" type="button" data-action="retry">Reset</button>
      </div>
    </div>
  `;
  bindGameEvents();
}

function bindGameEvents() {
  if (!state) return;
  app.querySelector('[data-action="list"]')?.addEventListener("click", () => {
    openWorld = state?.level.world ?? openWorld;
    screen = "list";
    state = null;
    render();
  });
  app.querySelector('[data-action="retry"]')?.addEventListener("click", () => {
    if (state) startLevel(state.level.uid);
  });
  app.querySelector('[data-action="next"]')?.addEventListener("click", () => {
    if (!state) return;
    const nxt = nextLevel(state.level);
    if (nxt && stageUnlocked({ ...nxt, uid: nxt.uid })) startLevel(nxt.uid);
    else {
      screen = "worlds";
      state = null;
      render();
    }
  });
  app.querySelector('[data-action="wait"]')?.addEventListener("click", () => {
    if (!state || animating) return;
    if (waitTurn(state)) {
      toast = "L'eco sbiadisce";
      buzz(12);
      renderGame({ overlay: state.status === "lost" ? "lost" : undefined });
    }
  });
  app.querySelector('[data-action="hint"]')?.addEventListener("click", () => {
    if (!state || animating) return;
    const action = hintAction(state);
    state.hint = action;
    if (!action) toast = "Nessun aiuto";
    else if (action.kind === "wait") toast = "Attendi: l'eco deve sbiadire";
    else if (action.kind === "spin") toast = "Ruota la girevole (↻)";
    else toast = "Tocca la freccia evidenziata";
    renderGame();
  });

  app.querySelectorAll<HTMLButtonElement>("[data-spin]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (!state || animating) return;
      const id = btn.dataset.spin;
      if (!id) return;
      if (spinArrow(state, id)) {
        buzz(20);
        toast = "Ruotata · −1 mossa";
        renderGame({ overlay: state.status === "lost" ? "lost" : undefined });
      }
    });
  });

  app.querySelectorAll<HTMLButtonElement>(".arrow-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      if (id) void onLaunch(id);
    });
  });
}

async function onLaunch(id: string) {
  if (!state || animating || state.status !== "playing") return;
  const result = launchArrow(state, id);
  if (!result.ok) {
    buzz(40);
    toast = "Via occupata";
    renderGame({
      shakeHeart: true,
      overlay: result.status === "lost" ? "lost" : undefined,
    });
    return;
  }
  animating = true;
  buzz(14);
  toast = result.arrow.kind === "root" ? "Radice piantata" : "Eco lasciata";
  renderGame({ leavingArrows: [result.arrow] });
  await wait(320);
  if (result.won) {
    onLevelWon();
    toast = null;
    renderGame({ overlay: "won" });
  } else {
    renderGame({ overlay: state.loseReason ? "lost" : undefined });
  }
  animating = false;
}

function onLevelWon() {
  if (!state) return;
  if (!progress.cleared.includes(state.level.uid)) progress.cleared.push(state.level.uid);
  const nxt = nextLevel(state.level);
  if (nxt) progress.lastUid = nxt.uid;
  saveProgress();
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

render();

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  void navigator.serviceWorker.register("./sw.js");
}

declare global {
  interface Window {
    frecciotte: { start: (uid: string) => void };
  }
}
window.frecciotte = { start: startLevel };
