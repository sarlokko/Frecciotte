import { applyAction, cloneGame, createGame } from "./engine";
import { LEVELS } from "./levels";

export function assertLevelsSolvable() {
  return LEVELS.map((level) => {
    const state = cloneGame(createGame(level));
    let ok = true;
    for (const step of level.solution) {
      if (!applyAction(state, step)) {
        ok = false;
        break;
      }
    }
    if (state.arrows.length > 0) ok = false;
    return {
      uid: level.uid,
      world: level.world,
      stage: level.stage,
      ok,
      arrows: createGame(level).arrows.length,
      limit: level.moveLimit,
      steps: level.solution.length,
      size: `${level.rows}x${level.cols}`,
    };
  });
}
