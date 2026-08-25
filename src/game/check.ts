import { assertLevelsSolvable } from "./validate";

const report = assertLevelsSolvable();
const bad = report.filter((r) => !r.ok || r.arrows === 0);
console.table(report);
if (bad.length) {
  console.error("Livelli non validi", bad);
  process.exit(1);
}
console.log("ok", report.length);
