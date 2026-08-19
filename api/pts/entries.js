import { db } from "hatchable";
export const access = "admin";
export default async function(req,res){
  if(req.method==="GET"){const {competition_id}=req.query;if(!competition_id)return res.status(400).json({error:"competition_id is required"});const {rows}=await db.query("SELECT t.* FROM competition_entries ce JOIN teams t ON t.id=ce.team_id WHERE ce.competition_id=$1 ORDER BY t.name",[competition_id]);return res.json(rows);}
  const {competition_id,team_id}=req.body||{};if(!competition_id||!team_id)return res.status(400).json({error:"competition_id and team_id are required"});
  const {rows}=await db.query("INSERT INTO competition_entries (competition_id,team_id) VALUES ($1,$2) ON CONFLICT (competition_id,team_id) DO NOTHING RETURNING *",[competition_id,team_id]);
  if(!rows[0])return res.status(409).json({error:"Club is already entered."});res.json(rows[0]);
}