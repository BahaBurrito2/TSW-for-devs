import { db } from "hatchable";
export const access = "admin";
export const methods = ["POST"];

export default async function(req,res){
  const {team_id,confirmation}=req.body||{};
  if(!team_id||confirmation!=="DISBAND")return res.status(400).json({error:"Type DISBAND to confirm this irreversible club status change."});
  const {rows:found}=await db.query("SELECT * FROM teams WHERE id=$1",[team_id]);const team=found[0];
  if(!team)return res.status(404).json({error:"Club not found"});if(team.status==="disbanded")return res.status(409).json({error:"Club is already disbanded."});
  const {rows:players}=await db.query("SELECT id FROM players WHERE team_id=$1",[team_id]);
  const statements=[
    {sql:"UPDATE teams SET status='disbanded',disbanded_at=now() WHERE id=$1",params:[team_id]},
    {sql:"DELETE FROM matches WHERE status='pending' AND (home_team_id=$1 OR away_team_id=$1)",params:[team_id]},
    {sql:"DELETE FROM competition_entries ce USING competitions c JOIN seasons s ON s.id=c.season_id WHERE ce.competition_id=c.id AND ce.team_id=$1 AND s.status='active'",params:[team_id]},
    {sql:"UPDATE players SET team_id=NULL WHERE team_id=$1",params:[team_id]},
    ...players.map(p=>({sql:"INSERT INTO player_club_history (player_id,from_team_id,to_team_id,movement_type,note) VALUES ($1,$2,NULL,'free_agent','Club disbanded')",params:[p.id,team_id]}))
  ];
  await db.transaction(statements);
  res.json({message:"Club disbanded. Past results and player records are retained; pending fixtures and active cup entries were removed.",free_agents:players.length});
}