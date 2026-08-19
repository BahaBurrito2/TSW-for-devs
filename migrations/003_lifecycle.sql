ALTER TABLE teams ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disbanded'));
ALTER TABLE teams ADD COLUMN IF NOT EXISTS disbanded_at TIMESTAMP;
ALTER TABLE players ALTER COLUMN team_id DROP NOT NULL;

CREATE TABLE player_club_history (
  id BIGSERIAL PRIMARY KEY,
  player_id BIGINT NOT NULL REFERENCES players(id),
  from_team_id BIGINT REFERENCES teams(id),
  to_team_id BIGINT REFERENCES teams(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('transfer','free_agent','registration')),
  moved_at TIMESTAMP NOT NULL DEFAULT now(),
  note TEXT
);
CREATE INDEX idx_player_club_history_player ON player_club_history(player_id);