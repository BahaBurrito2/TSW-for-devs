import { db } from "hatchable";

export const access = "admin";
export const methods = ["POST"];

export default async function (req, res) {
  const { id, home_score, away_score, played_at, matchweek, forfeit_team_id } = req.body || {};
  if (!id) {
    res.status(400).json({ error: "id is required" });
    return;
  }

  let finalHome = home_score;
  let finalAway = away_score;
  let finalForfeit = forfeit_team_id ?? null;

  // Forfeit rule: the forfeiting side loses 3–0. Body may send either
  // { forfeit_team_id } or explicit scores; forfeit_team_id wins.
  if (forfeit_team_id !== undefined && forfeit_team_id !== null) {
    const { rows } = await db.query(
      `SELECT id, home_team_id, away_team_id FROM matches WHERE id = $1`,
      [id]
    );
    const match = rows[0];
    if (!match) {
      res.status(404).json({ error: "match not found" });
      return;
    }
    if (String(forfeit_team_id) === String(match.home_team_id)) {
      finalHome = 0;
      finalAway = 3;
    } else if (String(forfeit_team_id) === String(match.away_team_id)) {
      finalHome = 3;
      finalAway = 0;
    } else {
      res.status(400).json({ error: "forfeit_team_id must be one of the two teams in the match" });
      return;
    }
  }

  const hasScore = finalHome !== undefined && finalHome !== null && finalAway !== undefined && finalAway !== null;
  const { rows } = await db.query(
    `UPDATE matches SET
       home_score = COALESCE($2, home_score),
       away_score = COALESCE($3, away_score),
       played_at = COALESCE($4, played_at),
       matchweek = COALESCE($5, matchweek),
       forfeit_team_id = COALESCE($6, forfeit_team_id),
       notes = CASE WHEN $6 IS NOT NULL THEN 'Forfeit: 3–0 awarded to the non-forfeiting side' ELSE notes END,
       status = CASE WHEN $7 THEN 'played' ELSE status END
     WHERE id = $1
     RETURNING *`,
    [id, hasScore ? finalHome : null, hasScore ? finalAway : null, played_at || null, matchweek || null, finalForfeit, hasScore]
  );
  if (!rows[0]) {
    res.status(404).json({ error: "match not found" });
    return;
  }
  res.json(rows[0]);
}
