import { db } from "hatchable";
import { withMediaMany } from "../../lib/media.js";
export const access = "admin";

export default async function(req,res) {
  if(req.method==="GET"){
    const {status,position,to_team_id,transfer_type,sort}=req.query,clauses=[],params=[];
    if(status){params.push(status);clauses.push("tr.status=$"+params.length)}
    if(position){params.push(position);clauses.push("p.position=$"+params.length)}
    if(to_team_id){params.push(to_team_id);clauses.push("tr.to_team_id=$"+params.length)}
    if(transfer_type){params.push(transfer_type);clauses.push("tr.transfer_type=$"+params.length)}
    const order=sort==="player"?"p.name ASC":sort==="club"?"from_name ASC NULLS FIRST":"tr.listed_at DESC";
    const {rows}=await db.query("SELECT tr.*,p.name player_name,p.position,p.avatar_url,fr.name from_name,fr.crest_url from_crest_url,dst.name to_name,dst.crest_url to_crest_url FROM transfers tr JOIN players p ON p.id=tr.player_id LEFT JOIN teams fr ON fr.id=tr.from_team_id LEFT JOIN teams dst ON dst.id=tr.to_team_id "+(clauses.length?"WHERE "+clauses.join(" AND "):"")+" ORDER BY "+order,params);
    return res.json(await withMediaMany(rows,["avatar_url","from_crest_url","to_crest_url"]));
  }
  const b=req.body||{};
  if(b.action==="create"){
    if(!b.player_id)return res.status(400).json({error:"Select a player."});
    const {rows:pRows}=await db.query("SELECT team_id FROM players WHERE id=$1",[b.player_id]);const player=pRows[0];if(!player)return res.status(404).json({error:"Player not found"});
    if(b.to_team_id){const {rows:t}=await db.query("SELECT id FROM teams WHERE id=$1 AND status='active'",[b.to_team_id]);if(!t[0])return res.status(400).json({error:"Destination must be an active club."})}
    const {rows}=await db.query("INSERT INTO transfers (player_id,from_team_id,to_team_id,transfer_type,status,note) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",[b.player_id,player.team_id||null,b.to_team_id||null,b.transfer_type||"transfer",b.status||"pending",b.note||null]);
    if(b.status==="completed") return complete(rows[0],res);
    return res.json(rows[0]);
  }
  if(b.action==="complete"){
    const {rows}=await db.query("SELECT * FROM transfers WHERE id=$1",[b.transfer_id]);if(!rows[0])return res.status(404).json({error:"Transfer not found"});return complete(rows[0],res);
  }
  if(b.action==="cancel"){const {rows}=await db.query("UPDATE transfers SET status='cancelled' WHERE id=$1 AND status='pending' RETURNING *",[b.transfer_id]);if(!rows[0])return res.status(409).json({error:"Only pending transfers can be cancelled."});return res.json(rows[0]);}
  return res.status(400).json({error:"Unknown transfer action"});
}
async function complete(tr,res){
  if(tr.status==="completed")return res.status(409).json({error:"Transfer is already completed."});
  await db.transaction([
    {sql:"UPDATE players SET team_id=$2 WHERE id=$1",params:[tr.player_id,tr.to_team_id||null]},
    {sql:"UPDATE transfers SET status='completed',completed_at=now() WHERE id=$1",params:[tr.id]},
    {sql:"INSERT INTO player_club_history (player_id,from_team_id,to_team_id,movement_type,note) VALUES ($1,$2,$3,$4,$5)",params:[tr.player_id,tr.from_team_id||null,tr.to_team_id||null,tr.transfer_type,tr.note||null]}
  ]);
  res.json({message:"Transfer completed; the player's club and permanent history were updated.",id:tr.id});
}