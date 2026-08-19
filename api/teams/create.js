import { db } from "hatchable";

export const access = "admin";
export const methods = ["POST"];

export default async function (req, res) {
  const { name, crest_url, home_color, away_color, stadium, manager, league_id } = req.body || {};
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const { rows } = await db.query(
    `INSERT INTO teams (name, crest_url, home_color, away_color, stadium, manager)
     VALUES ($1, $2, COALESCE($3,'#22c55e'), COALESCE($4,'#0f172a'), $5, $6)
     RETURNING *`,
    [name, crest_url || null, home_color || null, away_color || null, stadium || null, manager || null]
  );
  const team = rows[0];
  if (league_id) {
    await db.query(
      `INSERT INTO league_teams (league_id, team_id) VALUES ($1, $2)
       ON CONFLICT (league_id, team_id) DO NOTHING`,
      [league_id, team.id]
    );
  }
  res.json(team);
}