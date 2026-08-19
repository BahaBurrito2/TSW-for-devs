-- Allow an admin to flip a fixture to a "live" state (FotMob-style LIVE chip)
-- before the final score is recorded.
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_status_check;
ALTER TABLE matches ADD CONSTRAINT matches_status_check CHECK (status IN ('pending','played','live'));
