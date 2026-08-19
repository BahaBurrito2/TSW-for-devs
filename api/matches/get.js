import { db } from "hatchable";
import { withMediaMany } from "../../lib/media.js";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const { match_id } = req.query;
  if (!match_id) return res.status(400).json({ error: "match_id is required" });
  const { rows } = await db.query(
    `SELECT m.*, ht.name AS home_team_name, ht.crest_url AS home_crest_url, ht.home_color,
            at.name AS away_team_name, at.crest_url AS away_crest_url, at.away_color,
            l.name AS league_name, l.id AS league_id, l.division_code
     FROM matches m
     JOIN teams ht ON ht.id = m.home_team_id
     JOIN teams at ON at.id = m.away_team_id
     JOIN leagues l ON l.id = m.league_id
     WHERE m.id = $1`, [match_id]);
  if (!rows[0]) return res.status(404).json({ error: "match not found" });
  const [match] = await withMediaMany(rows, ["home_crest_url", "away_crest_url"]);
  const { rows: events } = await db.query(
    `SELECT pr.*, p.name AS player_name, p.position, p.avatar_url, t.name AS team_name
     FROM player_ratings pr
     JOIN players p ON p.id = pr.player_id
     JOIN teams t ON t.id = pr.team_id
     WHERE pr.match_id = $1
     ORDER BY pr.team_id, pr.goals DESC, pr.assists DESC, pr.id`, [match_id]);
  res.json({ match, events: await withMediaMany(events, ["avatar_url"]) });
}
