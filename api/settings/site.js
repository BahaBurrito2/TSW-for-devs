import { db } from "hatchable";
import { mediaUrl } from "../../lib/media.js";
export const access="public";
export const methods=["GET"];
export default async function(req,res){
  const {rows}=await db.query("SELECT key,value FROM site_settings WHERE key='site_logo_url'");
  const raw=rows[0]?.value||null;
  res.json({site_logo_url:await mediaUrl(raw),site_logo_url_raw:raw});
}
