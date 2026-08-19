CREATE TABLE leagues (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  season TEXT NOT NULL,
  country TEXT,
  format TEXT DEFAULT 'home_away',
  relegation_spots INT DEFAULT 3,
  promotion_spots INT DEFAULT 2,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE teams (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  crest_url TEXT,
  home_color TEXT DEFAULT '#22c55e',
  away_color TEXT DEFAULT '#0f172a',
  stadium TEXT,
  manager TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE league_teams (
  id BIGSERIAL PRIMARY KEY,
  league_id BIGINT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(league_id, team_id)
);

CREATE TABLE players (
  id BIGSERIAL PRIMARY KEY,
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT 'CM' CHECK (position IN ('GK','RB','CB','LB','CM','ST')),
  shirt_number INT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE matches (
  id BIGSERIAL PRIMARY KEY,
  league_id BIGINT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  home_team_id BIGINT NOT NULL REFERENCES teams(id),
  away_team_id BIGINT NOT NULL REFERENCES teams(id),
  home_score INT,
  away_score INT,
  matchweek INT NOT NULL DEFAULT 1,
  played_at DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','played')),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE player_ratings (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id BIGINT NOT NULL REFERENCES teams(id),
  rating NUMERIC(3,1) NOT NULL,
  goals INT NOT NULL DEFAULT 0,
  assists INT NOT NULL DEFAULT 0,
  clean_sheet BOOLEAN NOT NULL DEFAULT false,
  yellow_cards INT NOT NULL DEFAULT 0,
  red_cards INT NOT NULL DEFAULT 0,
  minutes_played INT NOT NULL DEFAULT 90,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(match_id, player_id)
);

CREATE TABLE totw (
  id BIGSERIAL PRIMARY KEY,
  league_id BIGINT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  matchweek INT NOT NULL,
  position_code TEXT NOT NULL CHECK (position_code IN ('GK','RB','CB','LB','CM','ST')),
  slot_index INT NOT NULL DEFAULT 0,
  player_id BIGINT REFERENCES players(id),
  team_id BIGINT REFERENCES teams(id),
  match_rating NUMERIC(3,1),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','published')),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(league_id, matchweek, position_code, slot_index)
);

CREATE INDEX idx_teams_league ON league_teams(league_id);
CREATE INDEX idx_players_team ON players(team_id);
CREATE INDEX idx_matches_league ON matches(league_id);
CREATE INDEX idx_matches_status ON matches(league_id, status);
CREATE INDEX idx_ratings_match ON player_ratings(match_id);
CREATE INDEX idx_ratings_player ON player_ratings(player_id);
CREATE INDEX idx_totw_league_week ON totw(league_id, matchweek);