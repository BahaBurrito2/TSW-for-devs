import { db } from "hatchable";
export const access = "admin";
export const methods = ["POST"];
export default async function(req,res) {
  const {season_id,confirmation}=req.body||{};
  if(!season_id||confirmation!=="ARCHIVE")return res.status(400).json({error:"Type ARCHIVE to confirm force-archiving this PTS season."});
  const {rows}=await db.query("SELECT * FROM seasons WHERE id=$1",[season_id]);
  const season=rows[0];if(!season)return res.status(404).json({error:"Season not found"});
  if(season.status==="archived")return res.status(409).json({error:"Season is already archived."});
  await db.transaction([
    {sql:"UPDATE seasons SET status='archived',archived_at=now() WHERE id=$1",params:[season_id]},
    {sql:"UPDATE competitions SET status='completed' WHERE season_id=$1 AND status<>'completed'",params:[season_id]}
  ]);
  res.json({message:"Season force-archived. Existing divisions, awards, clubs, players, fixtures, and records remain preserved. No promotion/relegation was applied."});
}