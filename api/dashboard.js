import { db } from "hatchable";
import { withMediaMany } from "../lib/media.js";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const [leagueCount, matchCount, biggestWin, scorers, assists, defense] = await Promise.all([
    db.query(`SELECT COUNT(*)::int AS n FROM leagues`),
    db.query(`SELECT COUNT(*)::int AS n FROM matches WHERE status = 'played'`),
    db.query(
      `SELECT m.*, ht.name AS home_team_name, at.name AS away_team_name, l.name AS league_name,
              ABS(m.home_score - m.away_score) AS margin
       FROM matches m JOIN teams ht ON ht.id = m.home_team_id JOIN teams at ON at.id = m.away_team_id
       JOIN leagues l ON l.id = m.league_id
       WHERE m.status = 'played' AND m.played_at >= (CURRENT_DATE - INTERVAL '7 days')
       ORDER BY margin DESC, m.played_at DESC LIMIT 1`
    ),
    db.query(
      `SELECT p.id AS player_id, p.name, p.avatar_url, t.name AS team_name, SUM(pr.goals)::int AS goals
       FROM player_ratings pr JOIN players p ON p.id = pr.player_id JOIN teams t ON t.id = pr.team_id
       GROUP BY p.id, p.name, p.avatar_url, t.name HAVING SUM(pr.goals) > 0 ORDER BY goals DESC LIMIT 5`
    ),
    db.query(
      `SELECT p.id AS player_id, p.name, p.avatar_url, t.name AS team_name, SUM(pr.assists)::int AS assists
       FROM player_ratings pr JOIN players p ON p.id = pr.player_id JOIN teams t ON t.id = pr.team_id
       GROUP BY p.id, p.name, p.avatar_url, t.name HAVING SUM(pr.assists) > 0 ORDER BY assists DESC LIMIT 5`
    ),
    db.query(
      `WITH team_matches AS (
         SELECT home_team_id AS team_id, away_score AS conceded FROM matches WHERE status = 'played'
         UNION ALL
         SELECT away_team_id, home_score FROM matches WHERE status = 'played'
       )
       SELECT t.id AS team_id, t.name AS team_name, COUNT(*)::int AS played, COALESCE(SUM(tm.conceded),0)::int AS conceded
       FROM team_matches tm JOIN teams t ON t.id = tm.team_id
       GROUP BY t.id, t.name HAVING COUNT(*) >= 1 ORDER BY conceded ASC LIMIT 5`
    )
  ]);

  res.json({
    active_leagues: leagueCount.rows[0].n,
    matches_played: matchCount.rows[0].n,
    biggest_win_this_week: biggestWin.rows[0] || null,
    top_scorers: await withMediaMany(scorers.rows, ["avatar_url"]),
    top_assists: await withMediaMany(assists.rows, ["avatar_url"]),
    best_defense: defense.rows
  });
}