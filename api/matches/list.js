import { db } from "hatchable";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const { league_id, status, matchweek } = req.query;
  if (!league_id) {
    res.status(400).json({ error: "league_id is required" });
    return;
  }
  const clauses = ["m.league_id = $1"];
  const params = [league_id];
  if (status) {
    params.push(status);
    clauses.push(`m.status = $${params.length}`);
  }
  if (matchweek) {
    params.push(matchweek);
    clauses.push(`m.matchweek = $${params.length}`);
  }
  const { rows } = await db.query(
    `SELECT m.*, ht.name AS home_team_name, at.name AS away_team_name,
            ht.home_color AS home_team_color, at.away_color AS away_team_color
     FROM matches m
     JOIN teams ht ON ht.id = m.home_team_id
     JOIN teams at ON at.id = m.away_team_id
     WHERE ${clauses.join(" AND ")}
     ORDER BY m.matchweek ASC, m.played_at ASC NULLS LAST, m.id ASC`,
    params
  );
  res.json(rows);
}