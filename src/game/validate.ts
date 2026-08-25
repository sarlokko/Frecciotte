import { createGame } from "./engine";
import { LEVELS } from "./levels";
import { solve } from "./solver";

export function assertLevelsSolvable(): {
  id: number;
  name: string;
  ok: boolean;
  arrows: number;
  steps: number;
}[] {
  return LEVELS.map((level) => {
    const game = createGame(level);
    const path = solve(level);
    return {
      id: level.id,
      name: level.name,
      ok: path !== null,
      arrows: game.arrows.length,
      steps: path?.length ?? 0,
    };
  });
}
