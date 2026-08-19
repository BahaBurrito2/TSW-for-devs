import { db } from "hatchable";
import { withMediaMany } from "../../lib/media.js";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const { league_id } = req.query;
  const clauses = [];
  const params = [];
  if (league_id) { params.push(league_id); clauses.push(`m.league_id = $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const [scorers, assists, defense] = await Promise.all([
    db.query(
      `SELECT p.id AS player_id, p.name, p.avatar_url, t.name AS team_name, t.crest_url, SUM(pr.goals)::int AS goals
       FROM player_ratings pr JOIN players p ON p.id = pr.player_id JOIN teams t ON t.id = pr.team_id
       JOIN matches m ON m.id = pr.match_id ${where}
       GROUP BY p.id, p.name, p.avatar_url, t.name, t.crest_url HAVING SUM(pr.goals) > 0
       ORDER BY goals DESC LIMIT 10`, params),
    db.query(
      `SELECT p.id AS player_id, p.name, p.avatar_url, t.name AS team_name, t.crest_url, SUM(pr.assists)::int AS assists
       FROM player_ratings pr JOIN players p ON p.id = pr.player_id JOIN teams t ON t.id = pr.team_id
       JOIN matches m ON m.id = pr.match_id ${where}
       GROUP BY p.id, p.name, p.avatar_url, t.name, t.crest_url HAVING SUM(pr.assists) > 0
       ORDER BY assists DESC LIMIT 10`, params),
    db.query(
      `WITH team_matches AS (
         SELECT m.id, m.home_team_id AS team_id, m.away_score AS conceded FROM matches m ${where}${where ? " AND" : "WHERE"} m.status = 'played'
         UNION ALL
         SELECT m.id, m.away_team_id, m.home_score FROM matches m ${where}${where ? " AND" : "WHERE"} m.status = 'played'
       )
       SELECT t.id AS team_id, t.name AS team_name, t.crest_url, COUNT(*)::int AS played, COALESCE(SUM(tm.conceded),0)::int AS conceded
       FROM team_matches tm JOIN teams t ON t.id = tm.team_id
       GROUP BY t.id, t.name, t.crest_url ORDER BY conceded ASC, played DESC LIMIT 10`, params)
  ]);

  res.json({
    top_scorers: await withMediaMany(scorers.rows, ["avatar_url", "crest_url"]),
    top_assists: await withMediaMany(assists.rows, ["avatar_url", "crest_url"]),
    best_defense: await withMediaMany(defense.rows, ["crest_url"])
  });
}