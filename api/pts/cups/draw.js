import { db } from "hatchable";
export const access = "admin";
export const methods = ["POST"];

function shuffle(list) { const a=[...list]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
export default async function(req,res) {
  const { competition_id, round_name } = req.body || {};
  if (!competition_id || !round_name) return res.status(400).json({error:"competition_id and round_name are required"});
  const { rows: compRows } = await db.query("SELECT * FROM competitions WHERE id = $1",[competition_id]);
  const comp=compRows[0]; if(!comp) return res.status(404).json({error:"Competition not found"});
  const { rows: existing } = await db.query("SELECT id FROM cup_ties WHERE competition_id = $1 AND round_name = $2 LIMIT 1",[competition_id,round_name]);
  if(existing[0]) return res.status(409).json({error:"That round has already been drawn."});
  const { rows: entries } = await db.query("SELECT team_id FROM competition_entries WHERE competition_id = $1 ORDER BY team_id",[competition_id]);
  if(entries.length < 2 || entries.length % 2) return res.status(400).json({error:"Competition needs an even number of entered clubs."});
  const teams=shuffle(entries.map(x=>x.team_id)), statements=[];
  for(let i=0;i<teams.length;i+=2){
    statements.push({sql:"INSERT INTO cup_ties (competition_id,round_name,tie_number,leg_number,home_team_id,away_team_id) VALUES ($1,$2,$3,1,$4,$5)",params:[competition_id,round_name,(i/2)+1,teams[i],teams[i+1]]});
    if(comp.format === "two_leg") statements.push({sql:"INSERT INTO cup_ties (competition_id,round_name,tie_number,leg_number,home_team_id,away_team_id) VALUES ($1,$2,$3,2,$4,$5)",params:[competition_id,round_name,(i/2)+1,teams[i+1],teams[i]]});
  }
  await db.transaction(statements);
  await db.query("UPDATE competitions SET status = 'active' WHERE id = $1",[competition_id]);
  res.json({ties:teams.length/2, legs:comp.format === "two_leg" ? 2 : 1, message:"Random unseeded draw created."});
}