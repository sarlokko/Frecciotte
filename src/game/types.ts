export type Dir = "N" | "E" | "S" | "W";

export type Arrow = {
  id: string;
  r: number;
  c: number;
  dir: Dir;
};

export type LevelDef = {
  id: number;
  name: string;
  rows: number;
  cols: number;
  /** Grid of directions or '.' for empty. Rows as strings. */
  grid: string[];
};

export const DIR_DELTA: Record<Dir, { dr: number; dc: number }> = {
  N: { dr: -1, dc: 0 },
  E: { dr: 0, dc: 1 },
  S: { dr: 1, dc: 0 },
  W: { dr: 0, dc: -1 },
};

export const DIR_CHARS: Record<string, Dir> = {
  N: "N",
  U: "N",
  "^": "N",
  E: "E",
  R: "E",
  ">": "E",
  S: "S",
  D: "S",
  v: "S",
  V: "S",
  W: "W",
  L: "W",
  "<": "W",
};

export function parseLevel(def: LevelDef): Arrow[] {
  const arrows: Arrow[] = [];
  let n = 0;
  for (let r = 0; r < def.rows; r++) {
    const row = def.grid[r] ?? "";
    for (let c = 0; c < def.cols; c++) {
      const ch = row[c] ?? ".";
      const dir = DIR_CHARS[ch];
      if (dir) {
        arrows.push({ id: `a${n++}`, r, c, dir });
      }
    }
  }
  return arrows;
}

export function isClearPath(
  arrow: Arrow,
  occupied: Set<string>,
  rows: number,
  cols: number,
): boolean {
  const { dr, dc } = DIR_DELTA[arrow.dir];
  let r = arrow.r + dr;
  let c = arrow.c + dc;
  while (r >= 0 && r < rows && c >= 0 && c < cols) {
    if (occupied.has(`${r},${c}`)) return false;
    r += dr;
    c += dc;
  }
  return true;
}

export function occupiedSet(arrows: Arrow[]): Set<string> {
  return new Set(arrows.map((a) => `${a.r},${a.c}`));
}

export function movableArrows(
  arrows: Arrow[],
  rows: number,
  cols: number,
): Arrow[] {
  const occ = occupiedSet(arrows);
  return arrows.filter((a) => isClearPath(a, occ, rows, cols));
}
