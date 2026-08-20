import { db } from "hatchable";

export const access = "admin";
export const methods = ["POST"];

export default async function (req, res) {
  const { league_id, team_id } = req.body || {};
  if (!league_id || !team_id) {
    res.status(400).json({ error: "league_id and team_id are required" });
    return;
  }
  await db.query(
    `INSERT INTO league_teams (league_id, team_id) VALUES ($1, $2)
     ON CONFLICT (league_id, team_id) DO NOTHING`,
    [league_id, team_id]
  );
  res.json({ ok: true });
}