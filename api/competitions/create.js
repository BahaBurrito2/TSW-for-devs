import { db } from "hatchable";

export const access = "admin";
export const methods = ["POST"];

export default async function (req, res) {
  const { season_id, name, code, format, division_scope } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: "Competition name is required" });
  if (!["single_elimination", "two_leg"].includes(format)) {
    return res.status(400).json({ error: "format must be single_elimination or two_leg" });
  }
  let seasonId = season_id;
  if (!seasonId) {
    const { rows } = await db.query("SELECT id FROM seasons WHERE status = 'active' LIMIT 1");
    if (!rows[0]) return res.status(400).json({ error: "There is no active season to add a competition to." });
    seasonId = rows[0].id;
  }
  const safeCode = code && String(code).trim() ? String(code).trim().toUpperCase() : null;
  const { rows } = await db.query(
    `INSERT INTO competitions (season_id, name, code, format, division_scope)
     VALUES ($1, $2, COALESCE($3, upper(replace(regexp_replace($2, '[^a-zA-Z0-9 ]', '', 'g'), ' ', '_'))), $4, $5)
     RETURNING *`,
    [seasonId, String(name).trim(), safeCode, format, division_scope || null]
  );
  res.json(rows[0]);
}
