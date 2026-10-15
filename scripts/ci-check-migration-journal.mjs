import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = "src/db/migrations";
const journalPath = join(migrationsDir, "meta/_journal.json");

const journal = JSON.parse(readFileSync(journalPath, "utf8"));
const entries = journal.entries ?? [];

const sqlTags = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .map((name) => name.slice(0, -".sql".length))
  .sort();

const journalTags = entries.map((entry) => entry.tag).sort();

const missingFromJournal = sqlTags.filter((tag) => !journalTags.includes(tag));
const missingSql = journalTags.filter((tag) => !sqlTags.includes(tag));

if (missingFromJournal.length > 0 || missingSql.length > 0) {
  console.error("Migration journal is out of sync with SQL files.");
  if (missingFromJournal.length > 0) {
    console.error(
      `  SQL without journal entry: ${missingFromJournal.join(", ")}`,
    );
  }
  if (missingSql.length > 0) {
    console.error(`  Journal entry without SQL: ${missingSql.join(", ")}`);
  }
  process.exit(1);
}

for (const [index, entry] of entries.entries()) {
  if (entry.idx !== index) {
    console.error(
      `Journal idx ${entry.idx} at position ${index} is not sequential (expected ${index}).`,
    );
    process.exit(1);
  }
}

console.log(
  `Migration journal OK (${entries.length} entries match ${sqlTags.length} SQL files).`,
);
