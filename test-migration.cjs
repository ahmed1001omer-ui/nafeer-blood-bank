const { createClient } = require("@libsql/client");
async function main() {
  const db = createClient({ url: "file:./blood-bank-migration-test.db" });
  try {
    const sql = require("fs").readFileSync("./src/db/migrations/0002_post_responses.sql", "utf8");
    for (const statement of sql.split(";").map(s => s.trim()).filter(Boolean)) {
      await db.execute(statement);
    }
    const r = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='post_responses'");
    console.log(r.rows.length ? "TEST PASSED: post_responses exists" : "TEST FAILED");
  } finally {
    await db.close();
  }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
