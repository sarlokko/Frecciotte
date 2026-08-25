import {
  isClearPath,
  movableArrows,
  occupiedSet,
  parseLevel,
  type Arrow,
  type Dir,
} from "./types";
import { LEVELS, MAX_HEARTS, type GeneratedLevel } from "./levels";

export type GameStatus = "playing" | "won" | "lost";

export type GameState = {
  level: GeneratedLevel;
  arrows: Arrow[];
  hearts: number;
  status: GameStatus;
  hintId: string | null;
  moves: number;
  mistakes: number;
};

export type AttemptResult =
  | { ok: true; arrow: Arrow; remaining: Arrow[] }
  | {
      ok: false;
      reason: "blocked" | "gone" | "ended";
      hearts: number;
      status: GameStatus;
    };

export function createGame(level: GeneratedLevel): GameState {
  return {
    level,
    arrows: parseLevel(level),
    hearts: MAX_HEARTS,
    status: "playing",
    hintId: null,
    moves: 0,
    mistakes: 0,
  };
}

export function getLevel(id: number): GeneratedLevel | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function attemptMove(state: GameState, arrowId: string): AttemptResult {
  if (state.status !== "playing") {
    return {
      ok: false,
      reason: "ended",
      hearts: state.hearts,
      status: state.status,
    };
  }

  const arrow = state.arrows.find((a) => a.id === arrowId);
  if (!arrow) {
    return {
      ok: false,
      reason: "gone",
      hearts: state.hearts,
      status: state.status,
    };
  }

  const occ = occupiedSet(state.arrows);
  const clear = isClearPath(arrow, occ, state.level.rows, state.level.cols);

  if (!clear) {
    const hearts = Math.max(0, state.hearts - 1);
    const status: GameStatus = hearts === 0 ? "lost" : "playing";
    state.hearts = hearts;
    state.status = status;
    state.mistakes += 1;
    state.hintId = null;
    return { ok: false, reason: "blocked", hearts, status };
  }

  state.arrows = state.arrows.filter((a) => a.id !== arrowId);
  state.moves += 1;
  state.hintId = null;

  if (state.arrows.length === 0) {
    state.status = "won";
  }

  return { ok: true, arrow, remaining: state.arrows };
}

export function requestHint(state: GameState): Arrow | null {
  if (state.status !== "playing") return null;

  const remainingKeys = new Set(state.arrows.map((a) => `${a.r},${a.c}`));
  const nextKey = state.level.solutionKeys.find((k) => remainingKeys.has(k));
  if (nextKey) {
    const preferred = state.arrows.find((a) => `${a.r},${a.c}` === nextKey);
    if (preferred) {
      const occ = occupiedSet(state.arrows);
      if (isClearPath(preferred, occ, state.level.rows, state.level.cols)) {
        state.hintId = preferred.id;
        return preferred;
      }
    }
  }

  const moves = movableArrows(state.arrows, state.level.rows, state.level.cols);
  const pick = moves[0] ?? null;
  state.hintId = pick?.id ?? null;
  return pick;
}

export function dirLabel(dir: Dir): string {
  return { N: "↑", E: "→", S: "↓", W: "←" }[dir];
}
