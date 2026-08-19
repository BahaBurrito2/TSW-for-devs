import { db } from "hatchable";

export const access = "admin";
export const methods = ["POST"];

export default async function (req, res) {
  const { id, home_score, away_score, played_at, matchweek } = req.body || {};
  if (!id) {
    res.status(400).json({ error: "id is required" });
    return;
  }
  const hasScore = home_score !== undefined && home_score !== null && away_score !== undefined && away_score !== null;
  const { rows } = await db.query(
    `UPDATE matches SET
       home_score = COALESCE($2, home_score),
       away_score = COALESCE($3, away_score),
       played_at = COALESCE($4, played_at),
       matchweek = COALESCE($5, matchweek),
       status = CASE WHEN $6 THEN 'played' ELSE status END
     WHERE id = $1
     RETURNING *`,
    [id, hasScore ? home_score : null, hasScore ? away_score : null, played_at || null, matchweek || null, hasScore]
  );
  if (!rows[0]) {
    res.status(404).json({ error: "match not found" });
    return;
  }
  res.json(rows[0]);
}