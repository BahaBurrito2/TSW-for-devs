import { db } from "hatchable";
export const access = "admin";
export const methods = ["POST"];
export default async function(req,res){const b=req.body||{};if(!b.id||!b.name||!b.position)return res.status(400).json({error:"id, username and position are required"});const {rows}=await db.query("UPDATE players SET name=$2,position=$3,shirt_number=$4,avatar_url=$5,country=$6 WHERE id=$1 RETURNING *",[b.id,b.name,b.position,b.shirt_number||null,b.avatar_url||null,b.country||null]);if(!rows[0])return res.status(404).json({error:"Player not found"});res.json(rows[0]);}