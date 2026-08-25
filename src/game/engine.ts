import {
  DIRS,
  launchable,
  parseLevel,
  type Arrow,
  type Board,
  type Dir,
  type LevelDef,
} from "./types";
import { key, NEXT_DIR } from "./types";

export const MAX_HEARTS = 3;

export type GameStatus = "playing" | "won" | "lost";

export type Action =
  | { kind: "wind"; dir: Dir }
  | { kind: "spin"; id: string }
  | { kind: "wait" };

export type GameState = {
  level: LevelDef;
  board: Board;
  arrows: Arrow[];
  ecos: { r: number; c: number }[];
  hearts: number;
  status: GameStatus;
  combo: number;
  maxCombo: number;
  lastDir: Dir | null;
  moves: number;
  mistakes: number;
  hint: Action | null;
};

export type WindResult =
  | { ok: true; launched: Arrow[]; stormo: boolean; combo: number; won: boolean }
  | { ok: false; reason: "blocked" | "ended"; hearts: number; status: GameStatus };

export function createGame(level: LevelDef): GameState {
  const board = parseLevel(level);
  return {
    level,
    board,
    arrows: board.arrows.map((a) => ({ ...a })),
    ecos: [],
    hearts: MAX_HEARTS,
    status: "playing",
    combo: 0,
    maxCombo: 0,
    lastDir: null,
    moves: 0,
    mistakes: 0,
    hint: null,
  };
}

export function ecoSet(state: GameState): Set<string> {
  return new Set(state.ecos.map((e) => key(e.r, e.c)));
}

export function cloneGame(state: GameState): GameState {
  return {
    ...state,
    board: state.board,
    arrows: state.arrows.map((a) => ({ ...a })),
    ecos: state.ecos.map((e) => ({ ...e })),
    hint: state.hint ? { ...state.hint } : null,
  };
}

function loseHeart(state: GameState): void {
  state.hearts = Math.max(0, state.hearts - 1);
  state.mistakes += 1;
  state.hint = null;
  state.combo = 0;
  if (state.hearts === 0) state.status = "lost";
}

export function fireWind(state: GameState, dir: Dir): WindResult {
  if (state.status !== "playing") {
    return { ok: false, reason: "ended", hearts: state.hearts, status: state.status };
  }

  const launched = launchable(
    state.arrows,
    dir,
    ecoSet(state),
    state.board.walls,
    state.board.portalIndex,
    state.level.rows,
    state.level.cols,
  );

  if (launched.length === 0) {
    loseHeart(state);
    return { ok: false, reason: "blocked", hearts: state.hearts, status: state.status };
  }

  const ids = new Set(launched.map((a) => a.id));
  state.arrows = state.arrows.filter((a) => !ids.has(a.id));
  state.ecos = launched.map((a) => ({ r: a.r, c: a.c }));
  state.combo = state.lastDir === dir ? state.combo + 1 : 1;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  state.lastDir = dir;
  state.moves += 1;
  state.hint = null;

  if (state.arrows.length === 0) {
    state.ecos = [];
    state.status = "won";
  }

  return {
    ok: true,
    launched,
    stormo: launched.length >= 2,
    combo: state.combo,
    won: state.status === "won",
  };
}

export function spinArrow(state: GameState, id: string): boolean {
  if (state.status !== "playing") return false;
  const arrow = state.arrows.find((a) => a.id === id);
  if (!arrow?.spin) return false;
  arrow.dir = NEXT_DIR[arrow.dir];
  state.hint = null;
  return true;
}

export function waitEcho(state: GameState): boolean {
  if (state.status !== "playing") return false;
  if (state.ecos.length === 0) return false;
  state.ecos = [];
  state.hint = null;
  return true;
}

export function applyAction(state: GameState, action: Action): boolean {
  if (action.kind === "wind") return fireWind(state, action.dir).ok;
  if (action.kind === "spin") return spinArrow(state, action.id);
  return waitEcho(state);
}

export function currentLaunchable(state: GameState, dir: Dir): Arrow[] {
  return launchable(
    state.arrows,
    dir,
    ecoSet(state),
    state.board.walls,
    state.board.portalIndex,
    state.level.rows,
    state.level.cols,
  );
}

export function windsWithMoves(state: GameState): Dir[] {
  return DIRS.filter((d) => currentLaunchable(state, d).length > 0);
}
