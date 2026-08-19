import { db } from "hatchable";

export const access = "admin";
export const methods = ["POST"];

export default async function (req, res) {
  const { league_id, home_team_id, away_team_id, matchweek, played_at, home_score, away_score } = req.body || {};
  if (!league_id || !home_team_id || !away_team_id) {
    res.status(400).json({ error: "league_id, home_team_id and away_team_id are required" });
    return;
  }
  if (String(home_team_id) === String(away_team_id)) {
    res.status(400).json({ error: "home and away team must differ" });
    return;
  }
  const hasScore = home_score !== undefined && home_score !== null && away_score !== undefined && away_score !== null;
  const { rows } = await db.query(
    `INSERT INTO matches (league_id, home_team_id, away_team_id, matchweek, played_at, home_score, away_score, status)
     VALUES ($1, $2, $3, COALESCE($4,1), $5, $6, $7, $8)
     RETURNING *`,
    [league_id, home_team_id, away_team_id, matchweek || null, played_at || null,
     hasScore ? home_score : null, hasScore ? away_score : null, hasScore ? "played" : "pending"]
  );
  res.json(rows[0]);
}