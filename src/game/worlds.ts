import type { Mechanics } from "./types";

export type WorldDef = {
  id: string;
  name: string;
  tag: string;
  blurb: string;
  mechanics: Mechanics;
};

export const WORLDS: WorldDef[] = [
  {
    id: "eco",
    name: "L'Eco",
    tag: "Mondo 1",
    blurb: "Bivi, eco e poche mosse. Sbagliare l'ordine costa.",
    mechanics: { echoTtl: 1, trail: false, smoke: false },
  },
  {
    id: "traccia",
    name: "Le Tracce",
    tag: "Mondo 2",
    blurb: "Il volo inchiostra tutto il passaggio. L'eco è una scia.",
    mechanics: { echoTtl: 1, trail: true, smoke: false },
  },
  {
    id: "rugiada",
    name: "La Rugiada",
    tag: "Mondo 3",
    blurb: "L'eco resta due turni. Attendi, attendi, poi vola.",
    mechanics: { echoTtl: 2, trail: false, smoke: false },
  },
  {
    id: "girevoli",
    name: "Le Girevoli",
    tag: "Mondo 4",
    blurb: "Anello d'oro: tocca ↻ per ruotare. Ogni giro costa una mossa.",
    mechanics: { echoTtl: 1, trail: false, smoke: false },
  },
  {
    id: "fumo",
    name: "Il Fumo",
    tag: "Mondo 5",
    blurb: "Una freccia appanna tutta la riga o la colonna per un turno.",
    mechanics: { echoTtl: 1, trail: false, smoke: true },
  },
  {
    id: "portali",
    name: "I Portali",
    tag: "Mondo 6",
    blurb: "Due anelli gemelli piegano il volo dall'altra parte.",
    mechanics: { echoTtl: 1, trail: false, smoke: false },
  },
  {
    id: "radici",
    name: "Le Radici",
    tag: "Mondo 7",
    blurb: "Muri e scie su piazze enormi. Ogni eco conta, ogni mossa anche.",
    mechanics: { echoTtl: 1, trail: true, smoke: false },
  },
];

export function worldById(id: string): WorldDef {
  return WORLDS.find((w) => w.id === id) ?? WORLDS[0]!;
}
