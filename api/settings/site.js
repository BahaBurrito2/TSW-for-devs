import { db } from "hatchable";
export const access="public";
export const methods=["GET"];
export default async function(req,res){const {rows}=await db.query("SELECT key,value FROM site_settings WHERE key='site_logo_url'");res.json({site_logo_url:rows[0]?.value||null});}