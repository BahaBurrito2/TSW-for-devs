import { db } from "hatchable";

export const access = "admin";
export const methods = ["POST"];

const SLOTS = [
  { position_code: "GK", slot_index: 0 },
  { position_code: "RB", slot_index: 0 },
  { position_code: "CB", slot_index: 0 },
  { position_code: "LB", slot_index: 0 },
  { position_code: "CM", slot_index: 0 },
  { position_code: "ST", slot_index: 0 },
  { position_code: "ST", slot_index: 1 }
];

export default async function (req, res) {
  const { league_id, matchweek, force } = req.body || {};
  if (!league_id || !matchweek) {
    res.status(400).json({ error: "league_id and matchweek are required" });
    return;
  }

  const { rows: existing } = await db.query(
    `SELECT * FROM totw WHERE league_id = $1 AND matchweek = $2 AND status = 'published'`,
    [league_id, matchweek]
  );
  if (existing.length > 0 && !force) {
    res.status(409).json({ error: "This matchweek's TOTW is already published. Pass force:true to regenerate." });
    return;
  }

  const { rows: candidates } = await db.query(
    `SELECT pr.player_id, p.position, pr.team_id, pr.rating, pr.goals, pr.assists,
            (pr.yellow_cards + pr.red_cards) AS cards, pr.minutes_played
     FROM player_ratings pr
     JOIN players p ON p.id = pr.player_id
     JOIN matches m ON m.id = pr.match_id
     WHERE m.league_id = $1 AND m.matchweek = $2 AND m.status = 'played'
     ORDER BY p.position ASC, pr.rating DESC, (pr.goals + pr.assists) DESC, cards ASC, pr.minutes_played DESC`,
    [league_id, matchweek]
  );

  const byPosition = {};
  for (const c of candidates) {
    (byPosition[c.position] ||= []).push(c);
  }

  const statements = [];
  for (const slot of SLOTS) {
    const pool = byPosition[slot.position_code] || [];
    const pick = pool[slot.slot_index];
    statements.push({
      sql: `INSERT INTO totw (league_id, matchweek, position_code, slot_index, player_id, team_id, match_rating, status)
            VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')
            ON CONFLICT (league_id, matchweek, position_code, slot_index) DO UPDATE SET
              player_id = EXCLUDED.player_id, team_id = EXCLUDED.team_id,
              match_rating = EXCLUDED.match_rating, status = 'pending'`,
      params: [league_id, matchweek, slot.position_code, slot.slot_index,
        pick ? pick.player_id : null, pick ? pick.team_id : null, pick ? pick.rating : null]
    });
  }
  await db.transaction(statements);

  const { rows } = await db.query(
    `SELECT tw.*, p.name AS player_name, t.name AS team_name
     FROM totw tw LEFT JOIN players p ON p.id = tw.player_id LEFT JOIN teams t ON t.id = tw.team_id
     WHERE tw.league_id = $1 AND tw.matchweek = $2
     ORDER BY tw.position_code, tw.slot_index`,
    [league_id, matchweek]
  );
  res.json(rows);
}