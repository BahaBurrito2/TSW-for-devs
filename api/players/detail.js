import { db } from "hatchable";
import { withMedia, withMediaMany } from "../../lib/media.js";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const { player_id } = req.query;
  if (!player_id) {
    res.status(400).json({ error: "player_id is required" });
    return;
  }

  const [playerQ, activeSeasonQ] = await Promise.all([
    db.query(
      `SELECT p.*, t.name AS team_name, t.crest_url FROM players p LEFT JOIN teams t ON t.id = p.team_id WHERE p.id = $1`,
      [player_id]
    ),
    db.query(`SELECT id, name FROM seasons WHERE status = 'active' LIMIT 1`)
  ]);
  if (!playerQ.rows[0]) {
    res.status(404).json({ error: "player not found" });
    return;
  }
  const activeSeason = activeSeasonQ.rows[0] || null;

  const [allTimeQ, totwCountQ, awardsQ, historyQ] = await Promise.all([
    db.query(
      `SELECT pr.*, m.matchweek, m.played_at, m.league_id, l.name AS league_name, l.season_id
       FROM player_ratings pr JOIN matches m ON m.id = pr.match_id JOIN leagues l ON l.id = m.league_id
       WHERE pr.player_id = $1 ORDER BY m.played_at ASC NULLS LAST, m.matchweek ASC`,
      [player_id]
    ),
    db.query(`SELECT COUNT(*)::int AS n FROM totw WHERE player_id = $1 AND status = 'published'`, [player_id]),
    db.query(
      `SELECT aa.id, aa.awarded_at, aa.note, a.id AS award_id, a.name AS award_name, a.icon_url, a.color, a.award_type, s.name AS season_name
       FROM award_assignments aa
       JOIN awards a ON a.id = aa.award_id
       LEFT JOIN seasons s ON s.id = aa.season_id
       WHERE aa.player_id = $1
       ORDER BY aa.awarded_at DESC`,
      [player_id]
    ),
    db.query(
      `SELECT h.*, ft.name AS from_team_name, ft.crest_url AS from_crest_url, tt.name AS to_team_name, tt.crest_url AS to_crest_url, s.name AS season_name
       FROM player_club_history h
       LEFT JOIN teams ft ON ft.id = h.from_team_id
       LEFT JOIN teams tt ON tt.id = h.to_team_id
       LEFT JOIN seasons s ON s.id = h.season_id
       WHERE h.player_id = $1
       ORDER BY h.moved_at DESC, h.id DESC`,
      [player_id]
    )
  ]);

  const allTime = allTimeQ.rows;
  const seasonRows = activeSeason ? allTime.filter((r) => r.season_id === activeSeason.id) : [];

  const summarize = (rows) => ({
    apps: rows.length,
    avg_rating: rows.length ? Number((rows.reduce((s, r) => s + Number(r.rating), 0) / rows.length).toFixed(2)) : null,
    goals: rows.reduce((s, r) => s + r.goals, 0),
    assists: rows.reduce((s, r) => s + r.assists, 0),
    clean_sheets: rows.reduce((s, r) => s + (r.clean_sheet ? 1 : 0), 0),
    yellow_cards: rows.reduce((s, r) => s + r.yellow_cards, 0),
    red_cards: rows.reduce((s, r) => s + r.red_cards, 0)
  });

  // Attach an inclusive date range to each club stint: this entry's move
  // date through the moment the player's NEXT move away from that club
  // happened (or "present" for the current stint). History is already
  // newest-first, so the previous array element is the next-in-time move.
  const history = historyQ.rows.map((h, i) => ({
    ...h,
    stint_ends_at: i > 0 ? historyQ.rows[i - 1].moved_at : null
  }));

  const [player, historyWithMedia, awardsWithMedia] = await Promise.all([
    withMedia(playerQ.rows[0], ["avatar_url", "crest_url"]),
    withMediaMany(history, ["from_crest_url", "to_crest_url"]),
    withMediaMany(awardsQ.rows, ["icon_url"])
  ]);

  res.json({
    player,
    active_season: activeSeason,
    season: summarize(seasonRows),
    all_time: summarize(allTime),
    totw_appearances: totwCountQ.rows[0].n,
    awards: awardsWithMedia,
    transfer_history: historyWithMedia,
    // Kept for backward compatibility with any existing caller expecting
    // the flat all-time shape this endpoint used to return.
    apps: allTime.length,
    avg_rating: allTime.length ? (allTime.reduce((s, r) => s + Number(r.rating), 0) / allTime.length).toFixed(2) : null,
    goals: allTime.reduce((s, r) => s + r.goals, 0),
    assists: allTime.reduce((s, r) => s + r.assists, 0),
    history: allTime
  });
}