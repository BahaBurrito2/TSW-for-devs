import { db } from "hatchable";
const VALID_POS=["GK","RB","CB","LB","CM","ST"];
export const access="admin";
export const methods=["POST"];
export default async function(req,res){
 const {team_id,name,position,shirt_number,avatar_url,country}=req.body||{};
 if(!team_id||!name||!VALID_POS.includes(position))return res.status(400).json({error:"team_id, username and a valid position are required"});
 const {rows}=await db.query("INSERT INTO players (team_id,name,position,shirt_number,avatar_url,country) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",[team_id,name,position,shirt_number||null,avatar_url||null,country||null]);
 res.json(rows[0]);
}