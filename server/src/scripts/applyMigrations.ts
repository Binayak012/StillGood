import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

function resolveSqlitePath(url: string): string {
  if (url === "file::memory:" || url === ":memory:") {
    return ":memory:";
  }
  if (!url.startsWith("file:")) {
    throw new Error(`Unsupported DATABASE_URL for prototype migrations: ${url}`);
  }

  const raw = url.slice("file:".length);
  if (raw === ":memory:") {
    return ":memory:";
  }
  return path.resolve(process.cwd(), raw);
}

function main() {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  const dbPath = resolveSqlitePath(databaseUrl);
  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS "_manual_migrations" (
      "name" TEXT PRIMARY KEY,
      "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const appliedRows = db.prepare(`SELECT "name" FROM "_manual_migrations"`).all() as Array<{
    name: string;
  }>;
  const applied = new Set(appliedRows.map((row) => row.name));

  const migrationsDir = path.resolve(process.cwd(), "prisma", "migrations");
  if (!fs.existsSync(migrationsDir)) {
    console.log("No migration directory found, nothing to apply.");
    db.close();
    return;
  }

  const migrationFolders = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const folder of migrationFolders) {
    const migrationName = folder;
    const migrationPath = path.join(migrationsDir, folder, "migration.sql");
    if (!fs.existsSync(migrationPath) || applied.has(migrationName)) {
      continue;
    }

    const sql = fs.readFileSync(migrationPath, "utf8");
    const apply = db.transaction(() => {
      db.exec(sql);
      db.prepare(`INSERT INTO "_manual_migrations" ("name") VALUES (?)`).run(migrationName);
    });
    apply();
    console.log(`Applied migration: ${migrationName}`);
  }

  db.close();
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
