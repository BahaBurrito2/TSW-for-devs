import { db } from "hatchable";
import { withMediaMany } from "../../lib/media.js";
export const access = "public";
export const methods = ["GET"];
export default async function(req,res) {
  const { rows } = await db.query("SELECT * FROM news_posts WHERE status='published' ORDER BY featured DESC,published_at DESC NULLS LAST,created_at DESC");
  return res.json(await withMediaMany(rows, ["cover_url"]));
}