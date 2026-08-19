import { db } from "hatchable";
import { withMediaMany } from "../../lib/media.js";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const { league_id } = req.query;
  if (league_id) {
    const { rows } = await db.query(
      `SELECT t.* FROM teams t
       JOIN league_teams lt ON lt.team_id = t.id
       WHERE lt.league_id = $1 AND t.status = 'active'
       ORDER BY t.name ASC`,
      [league_id]
    );
    res.json(await withMediaMany(rows, ["crest_url", "secondary_crest_url"]));
    return;
  }
  const { rows } = await db.query(
    `SELECT t.*, COUNT(p.id)::int AS player_count,
       (SELECT lt.league_id FROM league_teams lt JOIN leagues lg ON lg.id = lt.league_id JOIN seasons s ON s.id = lg.season_id
         WHERE lt.team_id = t.id AND s.status = 'active' LIMIT 1) AS league_id,
       (SELECT lg.division_code FROM league_teams lt JOIN leagues lg ON lg.id = lt.league_id JOIN seasons s ON s.id = lg.season_id
         WHERE lt.team_id = t.id AND s.status = 'active' LIMIT 1) AS division_code
     FROM teams t
     LEFT JOIN players p ON p.team_id = t.id
     WHERE t.status = 'active'
     GROUP BY t.id ORDER BY t.name ASC`
  );
  res.json(await withMediaMany(rows, ["crest_url", "secondary_crest_url"]));
}