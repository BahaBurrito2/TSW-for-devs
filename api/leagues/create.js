import { db } from "hatchable";

export const access = "admin";
export const methods = ["POST"];

export default async function (req, res) {
  const { name, season, country, format, relegation_spots, promotion_spots } = req.body || {};
  if (!name || !season) {
    res.status(400).json({ error: "name and season are required" });
    return;
  }
  const { rows } = await db.query(
    `INSERT INTO leagues (name, season, country, format, relegation_spots, promotion_spots)
     VALUES ($1, $2, $3, COALESCE($4, 'home_away'), COALESCE($5, 3), COALESCE($6, 2))
     RETURNING *`,
    [name, season, country || null, format || null, relegation_spots ?? null, promotion_spots ?? null]
  );
  res.json(rows[0]);
}