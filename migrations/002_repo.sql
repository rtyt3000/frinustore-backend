-- Every plugin must point at a public source repository.
ALTER TABLE plugins ADD COLUMN repo_url TEXT;
ALTER TABLE plugins ADD COLUMN repo_checked_at BIGINT;
-- non-blocking note from the reachability check, shown to moderators
ALTER TABLE plugins ADD COLUMN repo_warning TEXT;

-- New project: nothing to backfill, so the constraint goes in right away.
-- If plugins already exist the column stays nullable; plugins without repo_url are kept out of
-- the catalog until their author sets one (then run: ALTER TABLE plugins ALTER COLUMN repo_url SET NOT NULL).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM plugins) THEN
    ALTER TABLE plugins ALTER COLUMN repo_url SET NOT NULL;
  END IF;
END $$;

-- Replacing the repository of an existing plugin goes through moderation.
CREATE TABLE repo_changes (
  id SERIAL PRIMARY KEY,
  plugin_id TEXT NOT NULL REFERENCES plugins (id) ON DELETE CASCADE,
  repo_url TEXT NOT NULL,
  warning TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  submitter_id BIGINT NOT NULL,
  reject_reason TEXT,
  mod_msgs JSONB NOT NULL DEFAULT '[]',
  created_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX repo_changes_pending_uniq ON repo_changes (plugin_id) WHERE status = 'pending';
