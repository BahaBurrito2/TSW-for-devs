import { db } from "hatchable";
export const access = "admin";
export const methods = ["POST"];
export default async function(req,res) {
  const { league_id, confirmation }=req.body||{};
  if(!league_id||confirmation!=="DELETE") return res.status(400).json({error:"Type DELETE to confirm permanent league removal."});
  const {rows}=await db.query("SELECT id,name,season_id FROM leagues WHERE id=$1",[league_id]);
  const league=rows[0];if(!league)return res.status(404).json({error:"League not found"});
  if(league.season_id)return res.status(409).json({error:"PTS Division leagues are managed by season rollover and cannot be deleted individually."});
  await db.query("UPDATE leagues SET status='archived',archived_at=now() WHERE id=$1",[league_id]);
  res.json({message:"League archived. Historical fixtures, results, ratings, and standings remain in the records."});
}