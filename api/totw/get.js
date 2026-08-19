import { db } from "hatchable";
import { withMediaMany } from "../../lib/media.js";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const { league_id, matchweek } = req.query;
  if (!league_id || !matchweek) {
    res.status(400).json({ error: "league_id and matchweek are required" });
    return;
  }
  const { rows } = await db.query(
    `SELECT tw.*, p.name AS player_name, p.avatar_url, t.name AS team_name, t.crest_url
     FROM totw tw
     LEFT JOIN players p ON p.id = tw.player_id
     LEFT JOIN teams t ON t.id = tw.team_id
     WHERE tw.league_id = $1 AND tw.matchweek = $2
     ORDER BY tw.position_code, tw.slot_index`,
    [league_id, matchweek]
  );
  res.json(await withMediaMany(rows, ["avatar_url", "crest_url"]));
}