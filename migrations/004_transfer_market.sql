CREATE TABLE transfers (
  id BIGSERIAL PRIMARY KEY,
  player_id BIGINT NOT NULL REFERENCES players(id),
  from_team_id BIGINT REFERENCES teams(id),
  to_team_id BIGINT REFERENCES teams(id),
  transfer_type TEXT NOT NULL DEFAULT 'transfer' CHECK (transfer_type IN ('transfer','free_agent','loan','registration')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','cancelled')),
  note TEXT,
  listed_at TIMESTAMP NOT NULL DEFAULT now(),
  completed_at TIMESTAMP
);
CREATE INDEX idx_transfers_player ON transfers(player_id, listed_at DESC);
CREATE INDEX idx_transfers_status ON transfers(status, listed_at DESC);