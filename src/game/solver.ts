import { arrowClear, canWait, launchableArrows, type Action, type GameState } from "./engine";
import { key } from "./types";

export function hintAction(state: GameState): Action | null {
  const remaining = new Set(state.arrows.map((a) => key(a.r, a.c)));
  for (const step of state.level.solution) {
    if (step.kind === "wait") {
      if (canWait(state)) return step;
      continue;
    }
    if (step.kind === "spin" && remaining.has(step.at)) return step;
    if (step.kind === "go" && remaining.has(step.at)) {
      const arrow = state.arrows.find((a) => key(a.r, a.c) === step.at);
      if (arrow && arrowClear(state, arrow)) return step;
      if (canWait(state)) return { kind: "wait" };
      return step;
    }
  }
  const ready = launchableArrows(state)[0];
  if (ready) return { kind: "go", at: key(ready.r, ready.c) };
  if (canWait(state)) return { kind: "wait" };
  return null;
}
