import type { Arrow, Dir, LevelDef } from "./types";
import { DIR_DELTA, isClearPath, occupiedSet, parseLevel } from "./types";

const DIRS: Dir[] = ["N", "E", "S", "W"];

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

export type GeneratedLevel = LevelDef & {
  /** Removal order that clears the board (keys "r,c"). */
  solutionKeys: string[];
};

/** Build a solvable level by inserting arrows that are clear at insertion time. */
export function generateLevel(
  id: number,
  name: string,
  rows: number,
  cols: number,
  count: number,
  seed: number,
): GeneratedLevel {
  const rng = mulberry32(seed);
  const arrows: Arrow[] = [];
  let n = 0;

  for (let i = 0; i < count; i++) {
    const occ = occupiedSet(arrows);
    const candidates: { r: number; c: number; dir: Dir }[] = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (occ.has(`${r},${c}`)) continue;
        for (const dir of DIRS) {
          const probe: Arrow = { id: "tmp", r, c, dir };
          if (isClearPath(probe, occ, rows, cols)) {
            candidates.push({ r, c, dir });
          }
        }
      }
    }

    if (candidates.length === 0) break;

    const scored = candidates.map((cand) => {
      const { dr, dc } = DIR_DELTA[cand.dir];
      let len = 0;
      let r = cand.r + dr;
      let c = cand.c + dc;
      while (r >= 0 && r < rows && c >= 0 && c < cols) {
        len++;
        r += dr;
        c += dc;
      }
      return { cand, len };
    });
    scored.sort((a, b) => b.len - a.len);
    const top = scored.slice(0, Math.max(3, Math.ceil(scored.length * 0.35)));
    const chosen = pick(
      rng,
      top.map((s) => s.cand),
    );

    arrows.push({ id: `a${n++}`, ...chosen });
  }

  const grid = Array.from({ length: rows }, () => Array(cols).fill("."));
  for (const a of arrows) {
    grid[a.r]![a.c] = a.dir;
  }

  const solutionKeys = [...arrows].reverse().map((a) => `${a.r},${a.c}`);

  return {
    id,
    name,
    rows,
    cols,
    grid: grid.map((row) => row.join("")),
    solutionKeys,
  };
}

/** Verify by replaying known solution keys. */
export function verifySolution(level: GeneratedLevel): boolean {
  let remaining = parseLevel(level);
  for (const key of level.solutionKeys) {
    const arrow = remaining.find((a) => `${a.r},${a.c}` === key);
    if (!arrow) return false;
    const occ = occupiedSet(remaining);
    if (!isClearPath(arrow, occ, level.rows, level.cols)) return false;
    remaining = remaining.filter((a) => a.id !== arrow.id);
  }
  return remaining.length === 0;
}

const NAMES = [
  "Prima freccia",
  "Due vie",
  "Incrocio",
  "Ordine",
  "Blocco",
  "Corridoio",
  "Spirale",
  "Nodo",
  "Labirinto",
  "Pressione",
  "Catena",
  "Tessitura",
  "Groviglio",
  "Denso",
  "Maestro",
];

type Spec = { rows: number; cols: number; count: number; seed: number };

const SPECS: Spec[] = [
  { rows: 3, cols: 3, count: 1, seed: 11 },
  { rows: 3, cols: 3, count: 3, seed: 22 },
  { rows: 3, cols: 4, count: 5, seed: 33 },
  { rows: 4, cols: 4, count: 7, seed: 44 },
  { rows: 4, cols: 4, count: 9, seed: 55 },
  { rows: 4, cols: 5, count: 11, seed: 66 },
  { rows: 5, cols: 5, count: 14, seed: 77 },
  { rows: 5, cols: 5, count: 16, seed: 88 },
  { rows: 5, cols: 6, count: 18, seed: 99 },
  { rows: 6, cols: 6, count: 20, seed: 111 },
  { rows: 6, cols: 6, count: 24, seed: 122 },
  { rows: 6, cols: 7, count: 28, seed: 133 },
  { rows: 7, cols: 7, count: 32, seed: 144 },
  { rows: 7, cols: 7, count: 36, seed: 155 },
  { rows: 7, cols: 8, count: 40, seed: 166 },
];

export const LEVELS: GeneratedLevel[] = SPECS.map((spec, i) =>
  generateLevel(i + 1, NAMES[i] ?? `Livello ${i + 1}`, spec.rows, spec.cols, spec.count, spec.seed),
);

export const MAX_HEARTS = 3;
