import { db } from "hatchable";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const { match_id } = req.query;
  if (!match_id) {
    res.status(400).json({ error: "match_id is required" });
    return;
  }
  const { rows } = await db.query(
    `SELECT pr.*, p.name AS player_name, p.position, t.name AS team_name
     FROM player_ratings pr
     JOIN players p ON p.id = pr.player_id
     JOIN teams t ON t.id = pr.team_id
     WHERE pr.match_id = $1
     ORDER BY t.name, p.position`,
    [match_id]
  );
  res.json(rows);
}