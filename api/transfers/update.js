import { db } from "hatchable";

const STATUSES = ["pending", "completed", "cancelled"];

export const access = "admin";
export const methods = ["POST"];

export default async function (req, res) {
  const b = req.body || {};
  if (!b.id || !STATUSES.includes(b.status)) {
    res.status(400).json({ error: "id and a valid status (pending/completed/cancelled) are required" });
    return;
  }
  const { rows: transfers } = await db.query("SELECT * FROM transfers WHERE id = $1", [b.id]);
  const transfer = transfers[0];
  if (!transfer) return res.status(404).json({ error: "Transfer not found" });
  if (transfer.status !== "pending") {
    return res.status(400).json({ error: "Only a pending transfer can be updated." });
  }

  if (b.status === "completed") {
    const { rows: players } = await db.query("SELECT * FROM players WHERE id = $1", [transfer.player_id]);
    const player = players[0];
    if (!player) return res.status(404).json({ error: "Player no longer exists." });
    const { rows: seasonRows } = await db.query("SELECT id FROM seasons WHERE status = 'active' LIMIT 1");
    const seasonId = seasonRows[0] ? seasonRows[0].id : null;
    const movementType = transfer.transfer_type === "loan" ? "loan" : transfer.transfer_type === "free_agent" ? "free_agent" : "transfer";
    await db.transaction([
      { sql: "UPDATE players SET team_id = $2 WHERE id = $1", params: [transfer.player_id, transfer.to_team_id] },
      { sql: "INSERT INTO player_club_history (player_id, from_team_id, to_team_id, movement_type, note, season_id) VALUES ($1,$2,$3,$4,$5,$6)",
        params: [transfer.player_id, player.team_id || null, transfer.to_team_id, movementType, transfer.note, seasonId] },
      { sql: "UPDATE transfers SET status = 'completed', completed_at = now() WHERE id = $1", params: [b.id] }
    ]);
  } else {
    await db.query("UPDATE transfers SET status = $2 WHERE id = $1", [b.id, b.status]);
  }

  const { rows } = await db.query("SELECT * FROM transfers WHERE id = $1", [b.id]);
  res.json(rows[0]);
}