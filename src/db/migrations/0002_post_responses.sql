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
);

CREATE UNIQUE INDEX IF NOT EXISTS post_responses_post_user_idx
ON post_responses (post_id, mobile_user_id);
