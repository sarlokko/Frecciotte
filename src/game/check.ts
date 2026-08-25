import { assertLevelsSolvable } from "./validate";
import { WORLDS } from "./worlds";
import { levelsInWorld } from "./levels";

const report = assertLevelsSolvable();
const bad = report.filter((r) => !r.ok);
for (const w of WORLDS) {
  const n = levelsInWorld(w.id).length;
  console.log(w.id, n, "livelli");
}
console.table(report.filter((r) => r.world === "eco" || r.stage === 1 || r.stage === 15));
if (bad.length) {
  console.error("Livelli non validi", bad.slice(0, 20));
  process.exit(1);
}
if (report.length < 90) {
  console.error("Troppo pochi livelli", report.length);
  process.exit(1);
}
console.log("ok", report.length);
