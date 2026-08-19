import { db } from "hatchable";
export const access = "admin";
export const methods = ["POST"];

export default async function(req,res){
  const {player_id,to_team_id,note,confirmation}=req.body||{};
  if(confirmation!=="MOVE")return res.status(400).json({error:"Type MOVE to confirm a transfer or release."});
  if(!player_id)return res.status(400).json({error:"player_id is required"});
  const {rows:players}=await db.query("SELECT * FROM players WHERE id=$1",[player_id]);const player=players[0];
  if(!player)return res.status(404).json({error:"Player not found"});
  if(to_team_id){
    const {rows:clubs}=await db.query("SELECT id FROM teams WHERE id=$1 AND status='active'",[to_team_id]);
    if(!clubs[0])return res.status(400).json({error:"Destination must be an active club."});
  }
  if(String(player.team_id||"")===String(to_team_id||""))return res.status(400).json({error:"Player is already assigned to that club."});
  const {rows:seasonRows}=await db.query("SELECT id FROM seasons WHERE status='active' LIMIT 1");
  const seasonId=seasonRows[0]?seasonRows[0].id:null;
  await db.transaction([
    {sql:"UPDATE players SET team_id=$2 WHERE id=$1",params:[player_id,to_team_id||null]},
    {sql:"INSERT INTO player_club_history (player_id,from_team_id,to_team_id,movement_type,note,season_id,operated_by) VALUES ($1,$2,$3,$4,$5,$6,$7)",params:[player_id,player.team_id||null,to_team_id||null,to_team_id?"transfer":"free_agent",note||null,seasonId,req.member.email||req.member.handle]}
  ]);
  res.json({message:to_team_id?"Player transferred; all historical statistics stay attached to the player.":"Player released as a free agent; all historical statistics stay attached to the player."});
}