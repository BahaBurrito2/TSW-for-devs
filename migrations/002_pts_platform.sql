ALTER TABLE leagues ADD COLUMN IF NOT EXISTS season_id BIGINT;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS division_code TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS short_name TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS secondary_crest_url TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS forfeit_team_id BIGINT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE seasons (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  minimum_rating_apps INT NOT NULL DEFAULT 3,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  archived_at TIMESTAMP
);

CREATE TABLE competitions (
  id BIGSERIAL PRIMARY KEY,
  season_id BIGINT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('league','single_elimination','two_leg')),
  division_scope TEXT,
  status TEXT NOT NULL DEFAULT 'setup' CHECK (status IN ('setup','active','completed')),
  champion_team_id BIGINT REFERENCES teams(id),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(season_id, code)
);

CREATE TABLE competition_entries (
  id BIGSERIAL PRIMARY KEY,
  competition_id BIGINT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  team_id BIGINT NOT NULL REFERENCES teams(id),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(competition_id, team_id)
);

CREATE TABLE cup_ties (
  id BIGSERIAL PRIMARY KEY,
  competition_id BIGINT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  round_name TEXT NOT NULL,
  tie_number INT NOT NULL,
  leg_number INT NOT NULL DEFAULT 1,
  home_team_id BIGINT REFERENCES teams(id),
  away_team_id BIGINT REFERENCES teams(id),
  home_score INT,
  away_score INT,
  winner_team_id BIGINT REFERENCES teams(id),
  forfeit_team_id BIGINT REFERENCES teams(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','played')),
  played_at DATE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(competition_id, round_name, tie_number, leg_number)
);

CREATE TABLE news_posts (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Announcement',
  cover_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  featured BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE awards (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  color TEXT NOT NULL DEFAULT '#d4af37',
  award_type TEXT NOT NULL CHECK (award_type IN ('player','club')),
  scope TEXT NOT NULL CHECK (scope IN ('season','all_time')),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE award_assignments (
  id BIGSERIAL PRIMARY KEY,
  award_id BIGINT NOT NULL REFERENCES awards(id) ON DELETE CASCADE,
  player_id BIGINT REFERENCES players(id) ON DELETE CASCADE,
  team_id BIGINT REFERENCES teams(id) ON DELETE CASCADE,
  season_id BIGINT REFERENCES seasons(id) ON DELETE SET NULL,
  awarded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  CHECK ((player_id IS NOT NULL AND team_id IS NULL) OR (player_id IS NULL AND team_id IS NOT NULL))
);

CREATE INDEX idx_competitions_season ON competitions(season_id);
CREATE INDEX idx_cup_ties_competition ON cup_ties(competition_id);
CREATE INDEX idx_news_published ON news_posts(status, featured, published_at);
CREATE INDEX idx_award_assignments_player ON award_assignments(player_id);