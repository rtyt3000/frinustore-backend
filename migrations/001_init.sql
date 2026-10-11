CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  banned BOOLEAN NOT NULL DEFAULT FALSE,
  name TEXT,
  created_at BIGINT NOT NULL
);

CREATE TABLE plugins (
  rid SERIAL NOT NULL UNIQUE,
  id TEXT PRIMARY KEY,
  owner_user_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  author TEXT NOT NULL,
  description_json JSONB NOT NULL DEFAULT '""',
  icon TEXT NOT NULL DEFAULT 'inu://bot',
  hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL
);
CREATE INDEX plugins_owner_idx ON plugins (owner_user_id);

-- status: pending | approved | rejected | hidden | publishing (internal claim while the file is being sent)
CREATE TABLE versions (
  rid SERIAL PRIMARY KEY,
  plugin_id TEXT NOT NULL REFERENCES plugins (id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  msg_id INTEGER,
  date BIGINT NOT NULL,
  changelog TEXT,
  grants_json JSONB,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'hidden', 'publishing')),
  file_sha256 TEXT NOT NULL,
  file_id TEXT NOT NULL,
  submitter_id BIGINT NOT NULL,
  reject_reason TEXT,
  mod_msgs JSONB NOT NULL DEFAULT '[]',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  UNIQUE (plugin_id, version)
);
CREATE INDEX versions_status_idx ON versions (status);
CREATE INDEX versions_sha_idx ON versions (file_sha256);
CREATE INDEX versions_submitter_idx ON versions (submitter_id, created_at);

CREATE TABLE installs (
  plugin_id TEXT NOT NULL REFERENCES plugins (id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (plugin_id, user_id)
);

CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE sessions (
  user_id BIGINT PRIMARY KEY,
  state TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}',
  updated_at BIGINT NOT NULL
);

CREATE TABLE processed_updates (
  update_id BIGINT PRIMARY KEY,
  created_at BIGINT NOT NULL
);

CREATE TABLE jobs (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at BIGINT NOT NULL,
  done_at BIGINT,
  error TEXT
);
-- coalescing: at most one pending job per type
CREATE UNIQUE INDEX jobs_pending_uniq ON jobs (type) WHERE status = 'pending';
