import { db } from "hatchable";

export const access = "admin";
export const methods = ["POST"];

export default async function (req, res) {
  const { id, home_score, away_score, played_at, matchweek, forfeit_team_id, status } = req.body || {};
  if (!id) {
    res.status(400).json({ error: "id is required" });
    return;
  }
  const { rows: existingRows } = await db.query("SELECT * FROM matches WHERE id = $1", [id]);
  const match = existingRows[0];
  if (!match) {
    res.status(404).json({ error: "match not found" });
    return;
  }

  let finalHome = home_score;
  let finalAway = away_score;
  let finalForfeit = forfeit_team_id ?? match.forfeit_team_id;
  let finalStatus = match.status;
  let finalPlayedAt = played_at || match.played_at;
  const isForfeit = forfeit_team_id !== undefined && forfeit_team_id !== null;

  if (isForfeit) {
    if (String(forfeit_team_id) === String(match.home_team_id)) { finalHome = 0; finalAway = 3; }
    else if (String(forfeit_team_id) === String(match.away_team_id)) { finalHome = 3; finalAway = 0; }
    else return res.status(400).json({ error: "forfeit_team_id must be one of the two teams in the match" });
    finalStatus = "played";
  } else if (status === "played") {
    finalStatus = "played";
    finalPlayedAt = played_at || match.played_at || new Date();
  } else if (status === "live") {
    finalStatus = "live";
    finalPlayedAt = played_at || match.played_at || new Date();
  } else if (status === "pending") {
    finalStatus = "pending";
  } else if (home_score !== undefined && home_score !== null && away_score !== undefined && away_score !== null) {
    // Legacy callers: explicit scores imply a final result.
    finalStatus = "played";
  }

  const { rows } = await db.query(
    `UPDATE matches SET
       home_score = COALESCE($2, home_score),
       away_score = COALESCE($3, away_score),
       played_at = $4,
       matchweek = COALESCE($5, matchweek),
       forfeit_team_id = $6,
       notes = CASE WHEN $7 THEN 'Forfeit: 3–0 awarded to the non-forfeiting side' ELSE notes END,
       status = $8
     WHERE id = $1
     RETURNING *`,
    [
      id,
      finalHome !== undefined && finalHome !== null ? finalHome : null,
      finalAway !== undefined && finalAway !== null ? finalAway : null,
      finalPlayedAt,
      matchweek || null,
      finalForfeit,
      isForfeit,
      finalStatus
    ]
  );
  if (!rows[0]) {
    res.status(404).json({ error: "match not found" });
    return;
  }
  res.json(rows[0]);
}
