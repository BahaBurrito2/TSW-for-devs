import { db } from "hatchable";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const { team_a, team_b } = req.query;
  if (!team_a || !team_b) return res.status(400).json({ error: "team_a and team_b are required" });
  const { rows } = await db.query(
    `SELECT m.*, l.name AS league_name, ht.name AS home_team_name, at.name AS away_team_name
     FROM matches m
     JOIN leagues l ON l.id = m.league_id
     JOIN teams ht ON ht.id = m.home_team_id
     JOIN teams at ON at.id = m.away_team_id
     WHERE m.status = 'played'
       AND ((m.home_team_id = $1 AND m.away_team_id = $2) OR (m.home_team_id = $2 AND m.away_team_id = $1))
     ORDER BY m.played_at DESC NULLS LAST, m.id DESC`,
    [team_a, team_b]
  );
  res.json(rows);
}
