import { solve } from "./solver";
import {
  DIR_DELTA,
  DIRS,
  isClearPath,
  occupiedSet,
  parseLevel,
  type Arrow,
  type Dir,
  type LevelDef,
} from "./types";

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

/** Reverse-insert arrows so a wind-sequence exists; solver confirms ecos/wait. */
export function generatePuzzle(
  id: number,
  name: string,
  lesson: string,
  rows: number,
  cols: number,
  count: number,
  seed: number,
  spinCount = 0,
): LevelDef | null {
  for (let attempt = 0; attempt < 40; attempt++) {
    const rng = mulberry32(seed + attempt * 17);
    const arrows: Arrow[] = [];
    let n = 0;

    for (let i = 0; i < count; i++) {
      const occ = occupiedSet(arrows);
      const ecos = new Set<string>();
      const walls = new Set<string>();
      const portals = new Map<string, { r: number; c: number }>();
      const candidates: { r: number; c: number; dir: Dir }[] = [];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (occ.has(`${r},${c}`)) continue;
          for (const dir of DIRS) {
            const probe: Arrow = { id: "tmp", r, c, dir, spin: false };
            if (isClearPath(probe, occ, ecos, walls, portals, rows, cols)) {
              const { dr, dc } = DIR_DELTA[dir];
              let len = 0;
              let rr = r + dr;
              let cc = c + dc;
              while (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
                len++;
                rr += dr;
                cc += dc;
              }
              if (len >= 0) candidates.push({ r, c, dir });
            }
          }
        }
      }
      if (candidates.length === 0) break;
      const chosen = pick(rng, candidates);
      arrows.push({ id: `a${n++}`, ...chosen, spin: false });
    }

    if (arrows.length < Math.max(2, count - 1)) continue;

    const spinN = Math.min(spinCount, arrows.length);
    const idx = [...arrows.keys()];
    for (let s = 0; s < spinN; s++) {
      const j = Math.floor(rng() * idx.length);
      const pickI = idx.splice(j, 1)[0];
      if (pickI !== undefined) arrows[pickI]!.spin = true;
    }

    const grid = Array.from({ length: rows }, () => Array(cols).fill("."));
    for (const a of arrows) {
      const ch = a.spin ? a.dir.toLowerCase() : a.dir;
      grid[a.r]![a.c] = ch;
    }

    const def: LevelDef = {
      id,
      name,
      lesson,
      rows,
      cols,
      grid: grid.map((row) => row.join("")),
    };

    if (solve(def)) return def;
  }
  return null;
}

export const TUTORIAL: LevelDef[] = [
  {
    id: 1,
    name: "Primo vento",
    lesson: "Non scegli una freccia sola: scateni un vento. Scorri la griglia o usa i tasti sotto.",
    rows: 3,
    cols: 3,
    grid: ["...", ".E.", "..."],
  },
  {
    id: 2,
    name: "Due venti",
    lesson: "Ogni direzione è un vento. Soffia verso chi ha la via libera.",
    rows: 3,
    cols: 3,
    grid: [".S.", "...", "N.."],
  },
  {
    id: 3,
    name: "Stormo",
    lesson: "Un solo vento porta via tutte le frecce libere di quella direzione.",
    rows: 3,
    cols: 3,
    grid: ["E..", "...", "..E"],
  },
  {
    id: 4,
    name: "Eco",
    lesson: "Le frecce lasciano un'eco per un turno. L'eco occupa la cella.",
    rows: 3,
    cols: 3,
    grid: ["E.S", ".N.", "..."],
  },
  {
    id: 5,
    name: "Attesa",
    lesson: "Se l'eco chiude la via, tocca Attendi. Poi lancia di nuovo il vento.",
    rows: 3,
    cols: 4,
    grid: ["E..S", "....", "...."],
  },
  {
    id: 6,
    name: "Girevole",
    lesson: "L'anello d'oro ruota. Tocca la girevole, poi lancia il vento.",
    rows: 3,
    cols: 3,
    grid: [".#.", ".n.", "..."],
  },
  {
    id: 7,
    name: "Roccia",
    lesson: "La pietra non si sposta. Gira la freccia e fai svanire l'eco.",
    rows: 3,
    cols: 3,
    grid: ["Es.", ".#.", "..."],
  },
  {
    id: 8,
    name: "Portale",
    lesson: "I due anelli sono gemelli: il volo esce dall'altro lato.",
    rows: 3,
    cols: 4,
    grid: ["E.a#", "...b", "...."],
  },
];

const GEN_SPEC: {
  name: string;
  lesson: string;
  rows: number;
  cols: number;
  count: number;
  seed: number;
  spin: number;
}[] = [
  {
    name: "Doppio stormo",
    lesson: "Due stormi, due venti. Quale togliere per primo?",
    rows: 4,
    cols: 4,
    count: 6,
    seed: 404,
    spin: 0,
  },
  {
    name: "Cerniera",
    lesson: "Una girevole cambia il vento che puoi lanciare.",
    rows: 4,
    cols: 4,
    count: 7,
    seed: 505,
    spin: 1,
  },
  {
    name: "Traforo",
    lesson: "Pensa all'eco: a volte il passaggio si apre solo dopo l'attesa.",
    rows: 5,
    cols: 5,
    count: 9,
    seed: 606,
    spin: 1,
  },
  {
    name: "Croce",
    lesson: "Quattro direzioni strette. Non lanciare un vento vuoto.",
    rows: 5,
    cols: 5,
    count: 10,
    seed: 707,
    spin: 0,
  },
  {
    name: "Lanterna",
    lesson: "Girevoli e stormi insieme. Ruota solo se serve.",
    rows: 5,
    cols: 6,
    count: 12,
    seed: 808,
    spin: 2,
  },
  {
    name: "Sciame",
    lesson: "Tanti venti possibili. Il combo cresce se ripeti la stessa direzione.",
    rows: 6,
    cols: 6,
    count: 14,
    seed: 909,
    spin: 1,
  },
  {
    name: "Sagra",
    lesson: "La piazza piena. Stormo, eco, attesa, girevoli: svuotala.",
    rows: 6,
    cols: 6,
    count: 16,
    seed: 1010,
    spin: 2,
  },
];

function extraHandcrafted(): LevelDef[] {
  return [
    {
      id: 11,
      name: "Traforo",
      lesson: "Il portale piega il volo oltre la pietra. Prima libera l'uscita.",
      rows: 4,
      cols: 4,
      grid: ["#Ea.", "..b.", "S...", "..N."],
    },
    {
      id: 13,
      name: "Lanterna",
      lesson: "Due anelli, due girevoli. Ruota, attendi, poi lo stormo.",
      rows: 4,
      cols: 5,
      grid: [".#e#.", "S...a", "..N.b", ".#w.."],
    },
  ];
}

const generated: LevelDef[] = GEN_SPEC.map((spec, i) => {
  const id = 9 + i;
  const found = generatePuzzle(
    id,
    spec.name,
    spec.lesson,
    spec.rows,
    spec.cols,
    spec.count,
    spec.seed,
    spec.spin,
  );
  if (found) return { ...found, id };
  return {
    id,
    name: spec.name,
    lesson: spec.lesson,
    rows: spec.rows,
    cols: spec.cols,
    grid: Array.from({ length: spec.rows }, () => ".".repeat(spec.cols)),
  };
});

const extras = extraHandcrafted();

export const LEVELS: LevelDef[] = [...TUTORIAL, ...generated]
  .map((lvl) => {
    const extra = extras.find((e) => e.id === lvl.id);
    return extra ?? lvl;
  })
  .sort((a, b) => a.id - b.id);

export function describeLevel(level: LevelDef): { arrows: number; spins: number } {
  const board = parseLevel(level);
  return {
    arrows: board.arrows.length,
    spins: board.arrows.filter((a) => a.spin).length,
  };
}

