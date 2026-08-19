ALTER TABLE player_club_history ADD COLUMN IF NOT EXISTS season_id BIGINT REFERENCES seasons(id) ON DELETE SET NULL;
ALTER TABLE player_club_history ADD COLUMN IF NOT EXISTS operated_by TEXT;