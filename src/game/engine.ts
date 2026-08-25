import {
  isClearPath,
  key,
  NEXT_DIR,
  occupiedSet,
  parseLevel,
  residueSet,
  tracePath,
  type Arrow,
  type Board,
  type LevelDef,
  type Residue,
  type ResidueStyle,
  type SolStep,
} from "./types";

export const MAX_HEARTS = 3;

export type GameStatus = "playing" | "won" | "lost";
export type LoseReason = "hearts" | "moves" | null;

export type Action = SolStep;

export type GameState = {
  level: LevelDef;
  board: Board;
  arrows: Arrow[];
  residues: Residue[];
  hearts: number;
  movesLeft: number;
  status: GameStatus;
  loseReason: LoseReason;
  moves: number;
  mistakes: number;
  hint: Action | null;
};

export type LaunchResult =
  | { ok: true; arrow: Arrow; won: boolean }
  | { ok: false; reason: "blocked" | "ended"; hearts: number; status: GameStatus; loseReason: LoseReason };

export function createGame(level: LevelDef): GameState {
  const board = parseLevel(level);
  return {
    level,
    board,
    arrows: board.arrows.map((a) => ({ ...a })),
    residues: [],
    hearts: MAX_HEARTS,
    movesLeft: level.moveLimit,
    status: "playing",
    loseReason: null,
    moves: 0,
    mistakes: 0,
    hint: null,
  };
}

export function cloneGame(state: GameState): GameState {
  return {
    ...state,
    arrows: state.arrows.map((a) => ({ ...a })),
    residues: state.residues.map((e) => ({ ...e })),
    hint: state.hint ? { ...state.hint } : null,
  };
}

export function blockedSet(state: GameState): Set<string> {
  return residueSet(state.residues);
}

function spendMove(state: GameState): void {
  state.moves += 1;
  state.movesLeft = Math.max(0, state.movesLeft - 1);
  state.hint = null;
  if (state.arrows.length > 0 && state.movesLeft === 0) {
    state.status = "lost";
    state.loseReason = "moves";
  }
}

function loseHeart(state: GameState): void {
  state.hearts = Math.max(0, state.hearts - 1);
  state.mistakes += 1;
  state.hint = null;
  if (state.hearts === 0) {
    state.status = "lost";
    state.loseReason = "hearts";
  }
}

export function tickResidues(state: GameState): void {
  state.residues = state.residues
    .map((e) => (e.ttl < 0 ? e : { ...e, ttl: e.ttl - 1 }))
    .filter((e) => e.ttl !== 0);
}

export function canWait(state: GameState): boolean {
  return state.residues.some((e) => e.ttl > 0);
}

function addResidue(state: GameState, r: number, c: number, ttl: number, style: ResidueStyle) {
  const k = key(r, c);
  if (state.board.walls.has(k)) return;
  const existing = state.residues.find((e) => e.r === r && e.c === c);
  if (existing) {
    if (existing.ttl < 0 || ttl < 0) {
      existing.ttl = -1;
      existing.style = "root";
      return;
    }
    if (ttl > existing.ttl) existing.ttl = ttl;
    if (style === "smoke" || style === "trail") existing.style = style;
    return;
  }
  state.residues.push({ r, c, ttl, style });
}

function paintLaunch(state: GameState, arrow: Arrow, cells: { r: number; c: number }[]) {
  const ttl = state.level.mechanics.echoTtl;
  const startStyle: ResidueStyle = ttl > 1 ? "dew" : "echo";

  if (arrow.kind === "root") {
    addResidue(state, arrow.r, arrow.c, -1, "root");
  } else {
    addResidue(state, arrow.r, arrow.c, ttl, startStyle);
  }

  if (state.level.mechanics.trail) {
    for (const cell of cells) addResidue(state, cell.r, cell.c, ttl, "trail");
  }

  if (state.level.mechanics.smoke) {
    if (arrow.dir === "E" || arrow.dir === "W") {
      for (let c = 0; c < state.level.cols; c++) addResidue(state, arrow.r, c, ttl, "smoke");
    } else {
      for (let r = 0; r < state.level.rows; r++) addResidue(state, r, arrow.c, ttl, "smoke");
    }
  }
}

export function arrowClear(state: GameState, arrow: Arrow): boolean {
  return isClearPath(
    arrow,
    occupiedSet(state.arrows),
    blockedSet(state),
    state.board.walls,
    state.board.portalIndex,
    state.level.rows,
    state.level.cols,
  );
}

export function launchableArrows(state: GameState): Arrow[] {
  return state.arrows.filter((a) => arrowClear(state, a));
}

export function launchArrow(state: GameState, id: string): LaunchResult {
  if (state.status !== "playing") {
    return { ok: false, reason: "ended", hearts: state.hearts, status: state.status, loseReason: state.loseReason };
  }
  const arrow = state.arrows.find((a) => a.id === id);
  if (!arrow) {
    return { ok: false, reason: "blocked", hearts: state.hearts, status: state.status, loseReason: state.loseReason };
  }

  const occ = occupiedSet(state.arrows);
  const trace = tracePath(
    arrow,
    occ,
    blockedSet(state),
    state.board.walls,
    state.board.portalIndex,
    state.level.rows,
    state.level.cols,
  );

  if (!trace.clear) {
    loseHeart(state);
    return { ok: false, reason: "blocked", hearts: state.hearts, status: state.status, loseReason: state.loseReason };
  }

  state.arrows = state.arrows.filter((a) => a.id !== id);
  tickResidues(state);
  paintLaunch(state, arrow, trace.cells);
  if (state.arrows.length === 0) {
    state.residues = [];
    state.status = "won";
    state.moves += 1;
    state.movesLeft = Math.max(0, state.movesLeft - 1);
    state.hint = null;
    return { ok: true, arrow, won: true };
  }
  spendMove(state);
  return { ok: true, arrow, won: false };
}

export function waitTurn(state: GameState): boolean {
  if (state.status !== "playing" || !canWait(state)) return false;
  tickResidues(state);
  spendMove(state);
  return true;
}

export function spinArrow(state: GameState, id: string): boolean {
  if (state.status !== "playing") return false;
  const arrow = state.arrows.find((a) => a.id === id);
  if (!arrow || arrow.kind !== "spin") return false;
  arrow.dir = NEXT_DIR[arrow.dir];
  spendMove(state);
  return true;
}

export function applyAction(state: GameState, action: Action): boolean {
  if (action.kind === "wait") return waitTurn(state);
  if (action.kind === "spin") {
    const arrow = state.arrows.find((a) => key(a.r, a.c) === action.at);
    return arrow ? spinArrow(state, arrow.id) : false;
  }
  const arrow = state.arrows.find((a) => key(a.r, a.c) === action.at);
  return arrow ? launchArrow(state, arrow.id).ok : false;
}
