import { db } from "hatchable";
import { withMediaMany } from "../../lib/media.js";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const { league_id, min_apps, position, team_id } = req.query;
  const minApps = parseInt(min_apps, 10) || 3;
  const clauses = [];
  const params = [];
  if (league_id) { params.push(league_id); clauses.push(`m.league_id = $${params.length}`); }
  if (team_id) { params.push(team_id); clauses.push(`pr.team_id = $${params.length}`); }
  if (position) { params.push(position); clauses.push(`p.position = $${params.length}`); }
  const where = clauses.length ? `AND ${clauses.join(" AND ")}` : "";

  const { rows } = await db.query(
    `SELECT p.id AS player_id, p.name, p.position, p.avatar_url, t.id AS team_id, t.name AS team_name, t.crest_url,
       COUNT(pr.id)::int AS apps,
       ROUND(AVG(pr.rating), 2) AS avg_rating,
       ROUND(AVG(pr.rating) FILTER (WHERE pr.id IN (
         SELECT pr2.id FROM player_ratings pr2
         JOIN matches m2 ON m2.id = pr2.match_id
         WHERE pr2.player_id = p.id
         ORDER BY m2.played_at DESC NULLS LAST, m2.matchweek DESC
         LIMIT 5
       )), 2) AS avg_last5,
       SUM(pr.goals)::int AS goals,
       SUM(pr.assists)::int AS assists
     FROM player_ratings pr
     JOIN players p ON p.id = pr.player_id
     JOIN teams t ON t.id = pr.team_id
     JOIN matches m ON m.id = pr.match_id
     WHERE 1=1 ${where}
     GROUP BY p.id, p.name, p.position, p.avatar_url, t.id, t.name, t.crest_url
     HAVING COUNT(pr.id) >= $${params.length + 1}
     ORDER BY avg_rating DESC, apps DESC
     LIMIT 100`,
    [...params, minApps]
  );
  res.json(await withMediaMany(rows, ["avatar_url", "crest_url"]));
}