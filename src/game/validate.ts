import { LEVELS, verifySolution } from "./levels";

export function assertLevelsSolvable(): { id: number; name: string; ok: boolean; arrows: number }[] {
  return LEVELS.map((level) => ({
    id: level.id,
    name: level.name,
    ok: verifySolution(level),
    arrows: level.solutionKeys.length,
  }));
}
