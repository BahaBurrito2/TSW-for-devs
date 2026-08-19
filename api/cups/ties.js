import { db } from "hatchable";
import { withMediaMany } from "../../lib/media.js";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const { competition_id } = req.query;
  if (!competition_id) return res.status(400).json({ error: "competition_id is required" });
  const { rows: compRows } = await db.query("SELECT * FROM competitions WHERE id = $1", [competition_id]);
  const competition = compRows[0];
  if (!competition) return res.status(404).json({ error: "Competition not found" });

  const { rows } = await db.query(
    `SELECT ct.*, ht.name AS home_team_name, ht.crest_url AS home_crest_url,
            at.name AS away_team_name, at.crest_url AS away_crest_url,
            wt.name AS winner_team_name, wt.crest_url AS winner_crest_url
     FROM cup_ties ct
     LEFT JOIN teams ht ON ht.id = ct.home_team_id
     LEFT JOIN teams at ON at.id = ct.away_team_id
     LEFT JOIN teams wt ON wt.id = ct.winner_team_id
     WHERE ct.competition_id = $1
     ORDER BY ct.id ASC`,
    [competition_id]
  );
  const withMedia = await withMediaMany(rows, [
    "home_crest_url",
    "away_crest_url",
    "winner_crest_url"
  ]);
  const rounds = [];
  const byRound = {};
  for (const tie of withMedia) {
    if (!byRound[tie.round_name]) {
      byRound[tie.round_name] = { round_name: tie.round_name, ties: [] };
      rounds.push(byRound[tie.round_name]);
    }
    byRound[tie.round_name].ties.push(tie);
  }
  res.json({ competition, rounds });
}
