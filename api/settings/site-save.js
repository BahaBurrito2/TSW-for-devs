import { db } from "hatchable";
export const access="admin";
export const methods=["POST"];
export default async function(req,res){const {site_logo_url}=req.body||{};if(!site_logo_url)return res.status(400).json({error:"Upload or enter a logo URL."});await db.query("INSERT INTO site_settings (key,value,updated_at) VALUES ('site_logo_url',$1,now()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()",[site_logo_url]);res.json({site_logo_url});}