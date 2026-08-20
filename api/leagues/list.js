import { db } from "hatchable";

export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const { rows } = await db.query(
    `SELECT l.*, COUNT(DISTINCT lt.team_id)::int AS team_count,
            COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'played')::int AS matches_played
     FROM leagues l
     LEFT JOIN league_teams lt ON lt.league_id = l.id
     LEFT JOIN matches m ON m.league_id = l.id
     WHERE l.status = 'active'
     GROUP BY l.id
     ORDER BY l.created_at DESC`
  );
  res.json(rows);
}