import { applyAction, cloneGame, createGame, windsWithMoves, type Action, type GameState } from "./engine";
import type { LevelDef } from "./types";

function hashState(state: GameState): string {
  const arrows = [...state.arrows]
    .map((a) => `${a.id}:${a.dir}`)
    .sort()
    .join(";");
  const ecos = [...state.ecos]
    .map((e) => `${e.r},${e.c}`)
    .sort()
    .join(";");
  return `${arrows}|${ecos}`;
}

function actionsFrom(state: GameState): Action[] {
  const acts: Action[] = [];
  if (state.ecos.length > 0) acts.push({ kind: "wait" });
  for (const dir of windsWithMoves(state)) acts.push({ kind: "wind", dir });
  for (const a of state.arrows) {
    if (a.spin) acts.push({ kind: "spin", id: a.id });
  }
  return acts;
}

/** BFS: shortest action list that clears the board. */
export function solve(levelOrState: LevelDef | GameState, limit = 8000): Action[] | null {
  const start = "arrows" in levelOrState && "board" in levelOrState
    ? cloneGame(levelOrState)
    : createGame(levelOrState as LevelDef);

  if (start.arrows.length === 0) return [];

  const queue: { state: GameState; path: Action[] }[] = [{ state: start, path: [] }];
  const seen = new Set<string>([hashState(start)]);

  for (let i = 0; i < queue.length && i < limit; i++) {
    const node = queue[i]!;
    const acts = actionsFrom(node.state);
    for (const action of acts) {
      const next = cloneGame(node.state);
      if (!applyAction(next, action)) continue;
      if (next.status === "lost") continue;
      const h = hashState(next);
      if (seen.has(h)) continue;
      const path = [...node.path, action];
      if (next.status === "won" || next.arrows.length === 0) return path;
      seen.add(h);
      queue.push({ state: next, path });
    }
  }
  return null;
}

export function hintAction(state: GameState): Action | null {
  return solve(state)?.[0] ?? null;
}
