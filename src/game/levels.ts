import { buildLevel, finalizeHandcraft, type GenSpec } from "./generate";
import type { LevelDef, Mechanics } from "./types";
import { WORLDS } from "./worlds";

const ECO: Mechanics = { echoTtl: 1, trail: false, smoke: false };

const TUTORIAL: Omit<LevelDef, "moveLimit" | "solution">[] = [
  {
    uid: "eco-1",
    world: "eco",
    stage: 1,
    name: "Tocca",
    lesson: "Tocca la freccia. Parte solo se arriva al bordo.",
    rows: 3,
    cols: 3,
    grid: ["...", ".E.", "..."],
    mechanics: ECO,
  },
  {
    uid: "eco-2",
    world: "eco",
    stage: 2,
    name: "Dietro",
    lesson: "Quella davanti esce. L'eco resta: Attendi, poi la seconda.",
    rows: 3,
    cols: 4,
    grid: ["E.S.", "....", "...."],
    mechanics: ECO,
  },
  {
    uid: "eco-3",
    world: "eco",
    stage: 3,
    name: "Bivio",
    lesson: "Due libere. Se Attendi troppo presto, le mosse non bastano.",
    rows: 3,
    cols: 4,
    grid: ["E..S", ".N..", "...."],
    mechanics: ECO,
  },
  {
    uid: "eco-4",
    world: "eco",
    stage: 4,
    name: "Coda",
    lesson: "Tre in fila. L'eco di chi esce chiude chi resta.",
    rows: 3,
    cols: 5,
    grid: ["E.E.S", ".....", "....."],
    mechanics: ECO,
  },
  {
    uid: "eco-5",
    world: "eco",
    stage: 5,
    name: "Incrocio",
    lesson: "Tre uscite. Solo il percorso corto entra nel limite.",
    rows: 4,
    cols: 4,
    grid: [".S.W", "E...", "..N.", ".S.."],
    mechanics: ECO,
  },
  {
    uid: "eco-6",
    world: "eco",
    stage: 6,
    name: "Falso",
    lesson: "Quella libera non è sempre la prima giusta.",
    rows: 4,
    cols: 5,
    grid: ["E...S", "..N..", "W....", "..S.."],
    mechanics: ECO,
  },
  {
    uid: "eco-7",
    world: "eco",
    stage: 7,
    name: "Nodo",
    lesson: "Un Attendi al momento giusto. Non prima.",
    rows: 4,
    cols: 5,
    grid: ["E..S.", "N.W..", "..S.E", "....."],
    mechanics: ECO,
  },
  {
    uid: "eco-8",
    world: "eco",
    stage: 8,
    name: "Morsa",
    lesson: "Poche mosse, tante eco. Conta i turni.",
    rows: 4,
    cols: 4,
    grid: ["E.S.", "N..W", "S.E.", "...."],
    mechanics: ECO,
  },
];

type SizeCurve = {
  rows: number;
  cols: number;
  count: number;
  spins?: number;
  roots?: number;
  walls?: number;
  portals?: boolean;
  decoys?: number;
  spicy?: boolean;
  slack: number;
};

function curve(world: string, stage: number): SizeCurve {
  const t = (stage - 1) / 14;
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
  switch (world) {
    case "eco": {
      const u = Math.max(0, (stage - 9) / 6);
      const mix = (a: number, b: number) => Math.round(a + (b - a) * u);
      return {
        rows: mix(5, 8),
        cols: mix(5, 8),
        count: mix(8, 16),
        decoys: mix(2, 4),
        slack: 0,
        spicy: true,
      };
    }
    case "traccia":
      return { rows: lerp(5, 9), cols: lerp(5, 9), count: lerp(8, 20), slack: 2 };
    case "rugiada":
      return { rows: lerp(6, 10), cols: lerp(6, 10), count: lerp(10, 24), slack: 3 };
    case "girevoli":
      return {
        rows: lerp(6, 10),
        cols: lerp(6, 10),
        count: lerp(8, 20),
        spins: lerp(2, 6),
        walls: lerp(2, 8),
        slack: 3,
      };
    case "fumo":
      return { rows: lerp(7, 11), cols: lerp(7, 11), count: lerp(12, 28), slack: 3 };
    case "portali":
      return {
        rows: lerp(7, 11),
        cols: lerp(7, 11),
        count: lerp(12, 24),
        portals: true,
        walls: lerp(1, 5),
        slack: 3,
      };
    default:
      return {
        rows: lerp(8, 12),
        cols: lerp(8, 12),
        count: lerp(16, 32),
        spins: lerp(0, 3),
        walls: lerp(4, 12),
        portals: stage > 10,
        slack: 3,
      };
  }
}

const STAGE_NAMES = [
  "Primi passi",
  "Passo doppio",
  "Residuo",
  "Pausa",
  "Conto",
  "Nodo",
  "Fila",
  "Piazza",
  "Stretto",
  "Folla",
  "Labirinto",
  "Pressione",
  "Groviglio",
  "Denso",
  "Maestro",
];

function specFor(world: (typeof WORLDS)[number], stage: number): GenSpec {
  const size = curve(world.id, stage);
  return {
    world: world.id,
    stage,
    name: STAGE_NAMES[stage - 1] ?? `Livello ${stage}`,
    lesson: world.id === "eco" ? "Due uscite, una sola entra nelle mosse. L'eco decide." : world.blurb,
    ...size,
    seed: world.id.length * 1000 + stage * 97,
    mechanics: world.mechanics,
  };
}

function tutorialLevels(): LevelDef[] {
  const out: LevelDef[] = [];
  for (const raw of TUTORIAL) {
    const done = finalizeHandcraft({ ...raw, slack: 0 });
    if (!done) throw new Error(`Tutorial non risolvibile: ${raw.uid}`);
    out.push(done);
  }
  return out;
}

function generatedWorld(worldId: string, fromStage: number): LevelDef[] {
  const world = WORLDS.find((w) => w.id === worldId)!;
  const out: LevelDef[] = [];
  for (let stage = fromStage; stage <= 15; stage++) {
    let spec = specFor(world, stage);
    let level = buildLevel(spec);
    for (let shrink = 0; !level && shrink < 8; shrink++) {
      spec = {
        ...spec,
        count: Math.max(4, spec.count - 2),
        roots: 0,
        portals: shrink > 2 ? false : spec.portals,
        walls: Math.max(0, (spec.walls ?? 0) - 1),
        decoys: Math.max(0, (spec.decoys ?? 0) - 1),
        spicy: shrink < 5 ? spec.spicy : false,
        seed: spec.seed + 13 + shrink,
      };
      level = buildLevel(spec);
    }
    if (!level) throw new Error(`Generazione fallita ${worldId}-${stage}`);
    out.push(level);
  }
  return out;
}

export const LEVELS: LevelDef[] = [
  ...tutorialLevels(),
  ...generatedWorld("eco", 9),
  ...generatedWorld("traccia", 1),
  ...generatedWorld("rugiada", 1),
  ...generatedWorld("girevoli", 1),
  ...generatedWorld("fumo", 1),
  ...generatedWorld("portali", 1),
  ...generatedWorld("radici", 1),
];

export function levelsInWorld(worldId: string): LevelDef[] {
  return LEVELS.filter((l) => l.world === worldId).sort((a, b) => a.stage - b.stage);
}

export function findLevel(uid: string): LevelDef | undefined {
  return LEVELS.find((l) => l.uid === uid);
}

export function nextLevel(level: LevelDef): LevelDef | undefined {
  const same = levelsInWorld(level.world);
  const nxt = same.find((l) => l.stage === level.stage + 1);
  if (nxt) return nxt;
  const idx = WORLDS.findIndex((w) => w.id === level.world);
  const following = WORLDS[idx + 1];
  return following ? levelsInWorld(following.id)[0] : undefined;
}
