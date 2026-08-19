import { db } from "hatchable";
import { withMediaMany } from "../../lib/media.js";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const { rows: awards } = await db.query(
    `SELECT * FROM awards ORDER BY name`
  );
  const { rows: winnersRaw } = await db.query(
    `SELECT aa.id AS assignment_id, aa.award_id, aa.awarded_at, aa.note,
       p.id AS player_id, p.name AS player_name, p.avatar_url,
       t.id AS team_id, t.name AS team_name, t.crest_url,
       s.name AS season_name
     FROM award_assignments aa
     LEFT JOIN players p ON p.id = aa.player_id
     LEFT JOIN teams t ON t.id = aa.team_id
     LEFT JOIN seasons s ON s.id = aa.season_id
     ORDER BY aa.awarded_at DESC`
  );
  const [awardsWithMedia, winners] = await Promise.all([
    withMediaMany(awards, ["icon_url"]),
    withMediaMany(winnersRaw, ["avatar_url", "crest_url"])
  ]);
  const byAward = {};
  for (const w of winners) (byAward[w.award_id] ||= []).push(w);
  res.json(awardsWithMedia.map((a) => ({ ...a, winners: byAward[a.id] || [] })));
}