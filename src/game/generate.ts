import { applyAction, arrowClear, cloneGame, createGame } from "./engine";
import { charFor, DIRS, isClearPath, key, NEXT_DIR, occupiedSet, parseLevel, type Arrow, type Dir, type LevelDef, type Mechanics, type SolStep } from "./types";

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

export type GenSpec = {
  world: string;
  stage: number;
  name: string;
  lesson: string;
  rows: number;
  cols: number;
  count: number;
  seed: number;
  mechanics: Mechanics;
  spins?: number;
  roots?: number;
  walls?: number;
  portals?: boolean;
  slack: number;
};

function emptyGrid(rows: number, cols: number): string[][] {
  return Array.from({ length: rows }, () => Array(cols).fill("."));
}

function scatter(
  rng: () => number,
  rows: number,
  cols: number,
  count: number,
  forbidden: Set<string>,
): { r: number; c: number }[] {
  const spots: { r: number; c: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!forbidden.has(key(r, c))) spots.push({ r, c });
    }
  }
  const out: { r: number; c: number }[] = [];
  for (let i = 0; i < count && spots.length; i++) {
    const j = Math.floor(rng() * spots.length);
    out.push(spots.splice(j, 1)[0]!);
  }
  return out;
}

function toGrid(rows: number, cols: number, arrows: Arrow[], walls: Set<string>, portals: { a: { r: number; c: number }; b: { r: number; c: number } } | null): string[] {
  const g = emptyGrid(rows, cols);
  for (const k of walls) {
    const [r, c] = k.split(",").map(Number);
    if (r !== undefined && c !== undefined) g[r]![c] = "#";
  }
  if (portals) {
    g[portals.a.r]![portals.a.c] = "a";
    g[portals.b.r]![portals.b.c] = "b";
  }
  for (const a of arrows) g[a.r]![a.c] = charFor(a);
  return g.map((row) => row.join(""));
}

/** Reverse-insert arrows that are clear at insertion time. */
export function placeArrows(
  spec: GenSpec,
  rng: () => number,
): {
  arrows: Arrow[];
  walls: Set<string>;
  portal: { a: { r: number; c: number }; b: { r: number; c: number } } | null;
  order: string[];
  solvedDir: Record<string, Dir>;
} | null {
  const walls = new Set<string>();
  const forbidden = new Set<string>();
  let portal: { a: { r: number; c: number }; b: { r: number; c: number } } | null = null;

  if (spec.walls) {
    for (const p of scatter(rng, spec.rows, spec.cols, spec.walls, forbidden)) {
      walls.add(key(p.r, p.c));
      forbidden.add(key(p.r, p.c));
    }
  }
  if (spec.portals) {
    const pair = scatter(rng, spec.rows, spec.cols, 2, forbidden);
    if (pair.length === 2) {
      portal = { a: pair[0]!, b: pair[1]! };
      forbidden.add(key(pair[0]!.r, pair[0]!.c));
      forbidden.add(key(pair[1]!.r, pair[1]!.c));
    }
  }

  const portalIndex = new Map<string, { r: number; c: number }>();
  if (portal) {
    portalIndex.set(key(portal.a.r, portal.a.c), portal.b);
    portalIndex.set(key(portal.b.r, portal.b.c), portal.a);
  }

  const arrows: Arrow[] = [];
  let n = 0;
  for (let i = 0; i < spec.count; i++) {
    const occ = occupiedSet(arrows);
    const blocked = new Set<string>();
    const candidates: { r: number; c: number; dir: Dir }[] = [];
    for (let r = 0; r < spec.rows; r++) {
      for (let c = 0; c < spec.cols; c++) {
        if (occ.has(key(r, c)) || walls.has(key(r, c)) || forbidden.has(key(r, c))) continue;
        for (const dir of DIRS) {
          const probe: Arrow = { id: "t", r, c, dir, kind: "normal" };
          if (isClearPath(probe, occ, blocked, walls, portalIndex, spec.rows, spec.cols)) {
            candidates.push({ r, c, dir });
          }
        }
      }
    }
    if (!candidates.length) break;
    const chosen = pick(rng, candidates);
    arrows.push({ id: `a${n++}`, ...chosen, kind: "normal" });
  }

  if (arrows.length < Math.max(1, Math.floor(spec.count * 0.75))) return null;

  const order = [...arrows].reverse().map((a) => key(a.r, a.c));
  const solvedDir: Record<string, Dir> = {};
  for (const a of arrows) solvedDir[key(a.r, a.c)] = a.dir;

  const unused = arrows.filter((a) => a.kind === "normal");
  const spinN = Math.min(spec.spins ?? 0, unused.length);
  for (let i = 0; i < spinN; i++) {
    const j = Math.floor(rng() * unused.length);
    const a = unused.splice(j, 1)[0];
    if (a) {
      a.kind = "spin";
      const turns = 1 + Math.floor(rng() * 3);
      for (let t = 0; t < turns; t++) a.dir = NEXT_DIR[a.dir];
    }
  }
  const rootN = Math.min(spec.roots ?? 0, unused.length);
  for (let i = 0; i < rootN; i++) {
    const j = Math.floor(rng() * unused.length);
    const a = unused.splice(j, 1)[0];
    if (a) a.kind = "root";
  }

  return { arrows, walls, portal, order, solvedDir };
}

export function replaySolution(
  level: LevelDef,
  order: string[],
  solvedDir: Record<string, Dir> = {},
): SolStep[] | null {
  const state = createGame({ ...level, solution: [], moveLimit: 999 });
  const steps: SolStep[] = [];
  for (const at of order) {
    let guard = 0;
    while (guard++ < 16) {
      const arrow = state.arrows.find((a) => key(a.r, a.c) === at);
      if (!arrow) return null;
      const want = solvedDir[at];
      if (arrow.kind === "spin" && want && arrow.dir !== want) {
        if (!applyAction(state, { kind: "spin", at })) return null;
        steps.push({ kind: "spin", at });
        continue;
      }
      if (arrowClear(state, arrow)) break;
      if (!applyAction(state, { kind: "wait" })) return null;
      steps.push({ kind: "wait" });
    }
    const arrow = state.arrows.find((a) => key(a.r, a.c) === at);
    if (!arrow || !arrowClear(state, arrow)) return null;
    if (!applyAction(state, { kind: "go", at })) return null;
    steps.push({ kind: "go", at });
  }
  return state.status === "won" || state.arrows.length === 0 ? steps : null;
}

export function buildLevel(spec: GenSpec): LevelDef | null {
  for (let attempt = 0; attempt < 50; attempt++) {
    const rng = mulberry32(spec.seed + attempt * 31);
    const placed = placeArrows(spec, rng);
    if (!placed) continue;
    const grid = toGrid(spec.rows, spec.cols, placed.arrows, placed.walls, placed.portal);
    const draft: LevelDef = {
      uid: `${spec.world}-${spec.stage}`,
      world: spec.world,
      stage: spec.stage,
      name: spec.name,
      lesson: spec.lesson,
      rows: spec.rows,
      cols: spec.cols,
      grid,
      mechanics: spec.mechanics,
      moveLimit: 99,
      solution: [],
    };
    const solution = replaySolution(draft, placed.order, placed.solvedDir);
    if (!solution) continue;
    draft.solution = solution;
    draft.moveLimit = solution.length + spec.slack;
    const check = createGame(draft);
    const clone = cloneGame(check);
    for (const step of solution) {
      if (!applyAction(clone, step)) return null;
    }
    if (clone.status === "won" || clone.arrows.length === 0) return draft;
  }
  return null;
}

export function finalizeHandcraft(
  partial: Omit<LevelDef, "moveLimit" | "solution"> & { slack: number; order?: string[] },
): LevelDef | null {
  const board = parseLevel(partial);
  const order =
    partial.order ??
    board.arrows.map((a) => key(a.r, a.c));
  const draft: LevelDef = { ...partial, moveLimit: 99, solution: [] };
  const solution = replaySolution(draft, order);
  if (!solution) {
    // try every permutation for tiny boards
    if (board.arrows.length <= 6) {
      const keys = board.arrows.map((a) => key(a.r, a.c));
      const perms = permute(keys);
      for (const p of perms) {
        const sol = replaySolution(draft, p);
        if (sol) {
          draft.solution = sol;
          draft.moveLimit = sol.length + partial.slack;
          return draft;
        }
      }
    }
    return null;
  }
  draft.solution = solution;
  draft.moveLimit = solution.length + partial.slack;
  return draft;
}

function permute<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permute(rest)) out.push([arr[i]!, ...p]);
  }
  return out;
}
