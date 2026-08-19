import { db } from "hatchable";
import { withMediaMany } from "../../lib/media.js";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const { league_id, status, matchweek } = req.query;
  const clauses = [];
  const params = [];
  if (league_id) { params.push(league_id); clauses.push(`m.league_id = $${params.length}`); }
  if (status) { params.push(status); clauses.push(`m.status = $${params.length}`); }
  if (matchweek) { params.push(matchweek); clauses.push(`m.matchweek = $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await db.query(
    `SELECT m.*, ht.name AS home_team_name, ht.crest_url AS home_crest_url,
            at.name AS away_team_name, at.crest_url AS away_crest_url,
            l.name AS league_name, l.division_code
     FROM matches m
     JOIN teams ht ON ht.id = m.home_team_id
     JOIN teams at ON at.id = m.away_team_id
     JOIN leagues l ON l.id = m.league_id
     ${where}
     ORDER BY ${league_id ? "m.matchweek ASC, m.played_at ASC NULLS LAST" : "m.played_at DESC NULLS LAST, m.id DESC"}, m.id ASC`,
    params
  );
  res.json(await withMediaMany(rows, ["home_crest_url", "away_crest_url"]));
}
