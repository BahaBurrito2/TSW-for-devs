import { db } from "hatchable";

const TYPES = ["transfer", "free_agent", "loan"];

export const access = "admin";
export const methods = ["POST"];

export default async function (req, res) {
  const b = req.body || {};
  if (!b.player_id || !b.to_team_id || !TYPES.includes(b.transfer_type)) {
    res.status(400).json({ error: "player_id, to_team_id and a valid transfer_type (transfer/free_agent/loan) are required" });
    return;
  }
  const { rows: players } = await db.query("SELECT * FROM players WHERE id = $1", [b.player_id]);
  const player = players[0];
  if (!player) return res.status(404).json({ error: "Player not found" });
  const { rows: clubs } = await db.query("SELECT id FROM teams WHERE id = $1 AND status = 'active'", [b.to_team_id]);
  if (!clubs[0]) return res.status(400).json({ error: "Destination must be an active club." });
  if (String(player.team_id || "") === String(b.to_team_id)) {
    return res.status(400).json({ error: "Player is already at that club." });
  }

  const status = b.status === "completed" ? "completed" : "pending";
  const { rows } = await db.query(
    `INSERT INTO transfers (player_id, from_team_id, to_team_id, transfer_type, status, note, completed_at)
     VALUES ($1,$2,$3,$4,$5,$6, CASE WHEN $5 = 'completed' THEN now() ELSE NULL END) RETURNING *`,
    [b.player_id, player.team_id || null, b.to_team_id, b.transfer_type, status, b.note || null]
  );
  const transfer = rows[0];

  if (status === "completed") {
    const { rows: seasonRows } = await db.query("SELECT id FROM seasons WHERE status = 'active' LIMIT 1");
    const seasonId = seasonRows[0] ? seasonRows[0].id : null;
    const movementType = b.transfer_type === "loan" ? "loan" : b.transfer_type === "free_agent" ? "free_agent" : "transfer";
    await db.transaction([
      { sql: "UPDATE players SET team_id = $2 WHERE id = $1", params: [b.player_id, b.to_team_id] },
      { sql: "INSERT INTO player_club_history (player_id, from_team_id, to_team_id, movement_type, note, season_id) VALUES ($1,$2,$3,$4,$5,$6)",
        params: [b.player_id, player.team_id || null, b.to_team_id, movementType, b.note || null, seasonId] }
    ]);
  }

  res.json(transfer);
}