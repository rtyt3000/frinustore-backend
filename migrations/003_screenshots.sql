-- Plugin screenshots. A row exists from the moment the photo is accepted; msg_id stays NULL until
-- the photo is published to the channel (new plugins: on moderator approval), so unapproved
-- photos never reach the channel and are simply deleted on rejection.
-- A surrogate id replaces the (plugin_id, position) key so two rows can swap positions in one UPDATE.
CREATE TABLE screenshots (
  id SERIAL PRIMARY KEY,
  plugin_id TEXT NOT NULL REFERENCES plugins (id) ON DELETE CASCADE,
  position INT NOT NULL,
  msg_id BIGINT,
  file_id TEXT NOT NULL,
  file_unique_id TEXT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE INDEX screenshots_plugin_idx ON screenshots (plugin_id, position, id);
CREATE UNIQUE INDEX screenshots_photo_uniq ON screenshots (plugin_id, file_unique_id);
