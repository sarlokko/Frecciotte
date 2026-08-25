export type Dir = "N" | "E" | "S" | "W";
export type ArrowKind = "normal" | "spin" | "root";
export type ResidueStyle = "echo" | "trail" | "dew" | "smoke" | "root";

export type Arrow = {
  id: string;
  r: number;
  c: number;
  dir: Dir;
  kind: ArrowKind;
};

export type Residue = {
  r: number;
  c: number;
  ttl: number;
  style: ResidueStyle;
};

export type Portal = { a: { r: number; c: number }; b: { r: number; c: number } };

export type Mechanics = {
  echoTtl: number;
  trail: boolean;
  smoke: boolean;
};

export type SolStep =
  | { kind: "go"; at: string }
  | { kind: "wait" }
  | { kind: "spin"; at: string };

export type LevelDef = {
  uid: string;
  world: string;
  stage: number;
  name: string;
  lesson: string;
  rows: number;
  cols: number;
  grid: string[];
  mechanics: Mechanics;
  moveLimit: number;
  solution: SolStep[];
};

export const DIRS: Dir[] = ["N", "E", "S", "W"];

export const DIR_DELTA: Record<Dir, { dr: number; dc: number }> = {
  N: { dr: -1, dc: 0 },
  E: { dr: 0, dc: 1 },
  S: { dr: 1, dc: 0 },
  W: { dr: 0, dc: -1 },
};

export const NEXT_DIR: Record<Dir, Dir> = { N: "E", E: "S", S: "W", W: "N" };

export const DIR_GLYPH: Record<Dir, string> = { N: "↑", E: "→", S: "↓", W: "←" };

export const ROOT_CHARS: Record<string, Dir> = { "1": "N", "2": "E", "3": "S", "4": "W" };

export type Board = {
  arrows: Arrow[];
  walls: Set<string>;
  portals: Portal[];
  portalIndex: Map<string, { r: number; c: number }>;
};

export function key(r: number, c: number): string {
  return `${r},${c}`;
}

export function occupiedSet(arrows: Arrow[]): Set<string> {
  return new Set(arrows.map((a) => key(a.r, a.c)));
}

export function residueSet(residues: Residue[]): Set<string> {
  return new Set(residues.map((e) => key(e.r, e.c)));
}

export function parseLevel(def: Pick<LevelDef, "rows" | "cols" | "grid">): Board {
  const arrows: Arrow[] = [];
  const walls = new Set<string>();
  const marks: Record<string, { r: number; c: number }> = {};
  let n = 0;

  for (let r = 0; r < def.rows; r++) {
    const row = def.grid[r] ?? "";
    for (let c = 0; c < def.cols; c++) {
      const ch = row[c] ?? ".";
      if (ch === "#") {
        walls.add(key(r, c));
        continue;
      }
      if ("NESW".includes(ch)) {
        arrows.push({ id: `a${n++}`, r, c, dir: ch as Dir, kind: "normal" });
        continue;
      }
      if ("nesw".includes(ch)) {
        arrows.push({ id: `a${n++}`, r, c, dir: ch.toUpperCase() as Dir, kind: "spin" });
        continue;
      }
      const rootDir = ROOT_CHARS[ch];
      if (rootDir) {
        arrows.push({ id: `a${n++}`, r, c, dir: rootDir, kind: "root" });
        continue;
      }
      if ("abcd".includes(ch)) marks[ch] = { r, c };
    }
  }

  const portals: Portal[] = [];
  if (marks.a && marks.b) portals.push({ a: marks.a, b: marks.b });
  if (marks.c && marks.d) portals.push({ a: marks.c, b: marks.d });
  const portalIndex = new Map<string, { r: number; c: number }>();
  for (const p of portals) {
    portalIndex.set(key(p.a.r, p.a.c), p.b);
    portalIndex.set(key(p.b.r, p.b.c), p.a);
  }
  return { arrows, walls, portals, portalIndex };
}

export type Trace = { clear: boolean; cells: { r: number; c: number }[] };

export function tracePath(
  arrow: Arrow,
  occupied: Set<string>,
  blocked: Set<string>,
  walls: Set<string>,
  portalIndex: Map<string, { r: number; c: number }>,
  rows: number,
  cols: number,
): Trace {
  const { dr, dc } = DIR_DELTA[arrow.dir];
  const cells = [{ r: arrow.r, c: arrow.c }];
  let r = arrow.r;
  let c = arrow.c;
  const seen = new Set<string>();

  for (let step = 0; step < rows * cols + 8; step++) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return { clear: true, cells };

    const k = key(nr, nc);
    const warp = portalIndex.get(k);
    if (warp) {
      const dk = key(warp.r, warp.c);
      if (walls.has(dk) || occupied.has(dk) || blocked.has(dk)) return { clear: false, cells };
      if (seen.has(`w:${dk}`)) return { clear: false, cells };
      seen.add(`w:${dk}`);
      cells.push({ r: warp.r, c: warp.c });
      r = warp.r;
      c = warp.c;
      continue;
    }

    if (walls.has(k) || occupied.has(k) || blocked.has(k)) return { clear: false, cells };
    cells.push({ r: nr, c: nc });
    r = nr;
    c = nc;
  }
  return { clear: false, cells };
}

export function isClearPath(
  arrow: Arrow,
  occupied: Set<string>,
  blocked: Set<string>,
  walls: Set<string>,
  portalIndex: Map<string, { r: number; c: number }>,
  rows: number,
  cols: number,
): boolean {
  return tracePath(arrow, occupied, blocked, walls, portalIndex, rows, cols).clear;
}

export function charFor(arrow: Arrow): string {
  if (arrow.kind === "spin") return arrow.dir.toLowerCase();
  if (arrow.kind === "root") {
    return ({ N: "1", E: "2", S: "3", W: "4" } as const)[arrow.dir];
  }
  return arrow.dir;
}
