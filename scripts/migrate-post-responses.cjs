const { createClient } = require("@libsql/client");

async function main() {
  const databasePath = process.env.SQLITE_DB_PATH || "./blood-bank-test.db";
  const url = databasePath.startsWith("file:")
    ? databasePath
    : `file:${databasePath}`;

  const client = createClient({ url });

  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS post_responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        post_id INTEGER NOT NULL,
        mobile_user_id INTEGER NOT NULL,
        donor_name TEXT NOT NULL,
        donor_phone TEXT NOT NULL,
        blood_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        notes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    await client.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS post_responses_post_user_idx
      ON post_responses (post_id, mobile_user_id)
    `);

    // Add new columns safely if they do not already exist
    const columnsToAdd = [
      "ALTER TABLE post_responses ADD COLUMN is_nearby TEXT",
      "ALTER TABLE post_responses ADD COLUMN is_serious INTEGER DEFAULT 1",
      "ALTER TABLE post_responses ADD COLUMN estimated_arrival TEXT",
    ];

    for (const alterSql of columnsToAdd) {
      try {
        await client.execute(alterSql);
      } catch (err) {
        // Ignored if column already exists
      }
    }

    console.log("Post responses migration completed.");
  } finally {
    client.close();
  }
}

main().catch((error) => {
  console.error("Database migration failed:", error);
  process.exit(1);
});
