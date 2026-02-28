import { execSync } from "child_process";
import { Client } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.e2e", override: true });

const TEST_DB_URL = process.env.DATABASE_URL!;
// Strip ?schema=public — pg doesn't understand it
const pgUrl = TEST_DB_URL.replace(/\?.*$/, "");
const adminUrl = pgUrl.replace(/\/issueflow_test$/, "/issueflow");

export default async function globalSetup() {
  // Create test database if it doesn't exist
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  const { rows } = await admin.query(
    "SELECT 1 FROM pg_database WHERE datname = 'issueflow_test'"
  );
  if (rows.length === 0) {
    await admin.query("CREATE DATABASE issueflow_test");
    console.log("[e2e] Created issueflow_test database.");
  }
  await admin.end();

  // Apply any pending migrations
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "inherit",
  });

  // Wipe all data so every run starts clean
  const db = new Client({ connectionString: pgUrl });
  await db.connect();
  await db.query(`
    TRUNCATE
      "Comment", "Issue", "IssueType", "Status",
      "ProjectMembership", "Project", "User"
    RESTART IDENTITY CASCADE
  `);
  await db.end();
  console.log("[e2e] Test database is clean and ready.");
}
