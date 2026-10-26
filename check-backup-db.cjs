const { createClient } = require("@libsql/client");
async function main() {
  const db = createClient({ url: "file:./blood-bank-production-backup.db" });
  try {
    const r = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='post_responses'");
    console.log(r.rows.length ? "post_responses EXISTS" : "post_responses NOT FOUND");
  } finally {
    await db.close();
  }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
