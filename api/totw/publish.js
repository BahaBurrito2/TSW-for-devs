import { db } from "hatchable";

export const access = "admin";
export const methods = ["POST"];

export default async function (req, res) {
  const { league_id, matchweek } = req.body || {};
  if (!league_id || !matchweek) {
    res.status(400).json({ error: "league_id and matchweek are required" });
    return;
  }
  const { rows } = await db.query(
    `UPDATE totw SET status = 'published' WHERE league_id = $1 AND matchweek = $2 RETURNING *`,
    [league_id, matchweek]
  );
  if (rows.length === 0) {
    res.status(404).json({ error: "No TOTW picks found for this matchweek. Generate it first." });
    return;
  }
  res.json({ ok: true, published: rows.length });
}