import { db } from "hatchable";

export const access = "admin";
export const methods = ["POST"];

// body: { match_id, ratings: [{ player_id, team_id, rating, goals, assists, clean_sheet, yellow_cards, red_cards, minutes_played }] }
export default async function (req, res) {
  const { match_id, ratings } = req.body || {};
  if (!match_id || !Array.isArray(ratings) || ratings.length === 0) {
    res.status(400).json({ error: "match_id and a non-empty ratings array are required" });
    return;
  }
  const statements = ratings
    .filter((r) => r.player_id && r.team_id && r.rating !== undefined && r.rating !== null)
    .map((r) => ({
      sql: `INSERT INTO player_ratings (match_id, player_id, team_id, rating, goals, assists, clean_sheet, yellow_cards, red_cards, minutes_played)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            ON CONFLICT (match_id, player_id) DO UPDATE SET
              rating = EXCLUDED.rating, goals = EXCLUDED.goals, assists = EXCLUDED.assists,
              clean_sheet = EXCLUDED.clean_sheet, yellow_cards = EXCLUDED.yellow_cards,
              red_cards = EXCLUDED.red_cards, minutes_played = EXCLUDED.minutes_played`,
      params: [
        match_id, r.player_id, r.team_id, r.rating,
        r.goals || 0, r.assists || 0, !!r.clean_sheet, r.yellow_cards || 0, r.red_cards || 0, r.minutes_played ?? 90
      ]
    }));

  if (statements.length === 0) {
    res.status(400).json({ error: "no valid ratings supplied" });
    return;
  }

  await db.transaction(statements);
  const { rows } = await db.query(`SELECT * FROM player_ratings WHERE match_id = $1`, [match_id]);
  res.json(rows);
}