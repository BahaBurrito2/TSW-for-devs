import { db } from "hatchable";
import { withMediaMany } from "../../lib/media.js";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const { team_id, league_id } = req.query;
  if (team_id) {
    const { rows } = await db.query(
      `SELECT p.*, t.name AS team_name, t.crest_url FROM players p LEFT JOIN teams t ON t.id = p.team_id WHERE p.team_id = $1 ORDER BY
         CASE position WHEN 'GK' THEN 0 WHEN 'RB' THEN 1 WHEN 'CB' THEN 2 WHEN 'LB' THEN 3 WHEN 'CM' THEN 4 WHEN 'ST' THEN 5 END,
         shirt_number NULLS LAST`,
      [team_id]
    );
    res.json(await withMediaMany(rows, ["avatar_url", "crest_url"]));
    return;
  }
  if (league_id) {
    const { rows } = await db.query(
      `SELECT p.*, t.name AS team_name FROM players p
       JOIN teams t ON t.id = p.team_id
       JOIN league_teams lt ON lt.team_id = t.id
       WHERE lt.league_id = $1
       ORDER BY t.name, p.shirt_number NULLS LAST`,
      [league_id]
    );
    res.json(await withMediaMany(rows, ["avatar_url"]));
    return;
  }
  const { rows } = await db.query(`SELECT p.*, t.name AS team_name, t.crest_url FROM players p LEFT JOIN teams t ON t.id = p.team_id ORDER BY t.name NULLS FIRST, p.name`);
  res.json(await withMediaMany(rows, ["avatar_url", "crest_url"]));
}