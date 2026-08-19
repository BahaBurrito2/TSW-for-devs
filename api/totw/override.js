import { db } from "hatchable";

export const access = "admin";
export const methods = ["POST"];

// Manual admin override: swap the player in one TOTW slot
export default async function (req, res) {
  const { league_id, matchweek, position_code, slot_index, player_id } = req.body || {};
  if (!league_id || !matchweek || !position_code || player_id === undefined) {
    res.status(400).json({ error: "league_id, matchweek, position_code and player_id are required" });
    return;
  }
  const { rows: playerRows } = await db.query(`SELECT * FROM players WHERE id = $1`, [player_id]);
  const player = playerRows[0];
  if (!player) {
    res.status(404).json({ error: "player not found" });
    return;
  }
  if (player.position !== position_code) {
    res.status(400).json({ error: `${player.name} plays ${player.position}, not ${position_code}` });
    return;
  }
  const { rows } = await db.query(
    `INSERT INTO totw (league_id, matchweek, position_code, slot_index, player_id, team_id, status)
     VALUES ($1,$2,$3,COALESCE($4,0),$5,$6,'pending')
     ON CONFLICT (league_id, matchweek, position_code, slot_index) DO UPDATE SET
       player_id = EXCLUDED.player_id, team_id = EXCLUDED.team_id
     RETURNING *`,
    [league_id, matchweek, position_code, slot_index ?? null, player_id, player.team_id]
  );
  res.json(rows[0]);
}