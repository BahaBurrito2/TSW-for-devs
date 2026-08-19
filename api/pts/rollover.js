import { db } from "hatchable";
export const access = "admin";
export const methods = ["POST"];

export default async function(req,res) {
  const { season_id, next_season_name }=req.body||{};
  if(!season_id||!next_season_name) return res.status(400).json({error:"season_id and next_season_name are required"});
  const {rows: seasonRows}=await db.query("SELECT * FROM seasons WHERE id=$1 AND status='active'",[season_id]); const season=seasonRows[0];
  if(!season)return res.status(404).json({error:"Active season not found"});
  const {rows: leagues}=await db.query("SELECT * FROM leagues WHERE season_id=$1 ORDER BY division_code",[season_id]);
  if(leagues.length!==2)return res.status(400).json({error:"Season must have both divisions."});
  for(const league of leagues){const {rows}=await db.query("SELECT count(*)::int AS count FROM matches WHERE league_id=$1 AND status='played'",[league.id]);if(rows[0].count!==28)return res.status(400).json({error:"All 28 matches in each division must be recorded before rollover."});}
  const rank=async league=>{const {rows}=await db.query(`WITH x AS (SELECT home_team_id id,home_score gf,away_score ga FROM matches WHERE league_id=$1 UNION ALL SELECT away_team_id,away_score,home_score FROM matches WHERE league_id=$1) SELECT id, SUM(CASE WHEN gf>ga THEN 3 WHEN gf=ga THEN 1 ELSE 0 END)::int pts,SUM(gf-ga)::int gd,SUM(gf)::int gf FROM x GROUP BY id ORDER BY pts DESC,gd DESC,gf DESC`,[league.id]);return rows;};
  const d1=await rank(leagues.find(x=>x.division_code==="D1")), d2=await rank(leagues.find(x=>x.division_code==="D2"));
  if(d1.length!==8||d2.length!==8)return res.status(400).json({error:"Both divisions need eight clubs."});
  const {rows:newRows}=await db.query("INSERT INTO seasons (name,minimum_rating_apps) VALUES ($1,$2) RETURNING *",[next_season_name,season.minimum_rating_apps]);const next=newRows[0];
  await db.transaction([
    {sql:"INSERT INTO leagues (name,season,format,relegation_spots,promotion_spots,season_id,division_code) VALUES ('PTS Division 1',$1,'single_round_robin',2,0,$2,'D1')",params:[next.name,next.id]},
    {sql:"INSERT INTO leagues (name,season,format,relegation_spots,promotion_spots,season_id,division_code) VALUES ('PTS Division 2',$1,'single_round_robin',0,2,$2,'D2')",params:[next.name,next.id]},
    ...[["PTS Division 1","D1","league","D1"],["PTS Division 2","D2","league","D2"],["PTS Cup","CUP","single_elimination",null],["PTS Champions League","UCL","two_leg","D1"],["PTS Europa League","UEL","single_elimination","D2"]].map(x=>({sql:"INSERT INTO competitions (season_id,name,code,format,division_scope) VALUES ($1,$2,$3,$4,$5)",params:[next.id,...x]})),
    {sql:"UPDATE seasons SET status='archived',archived_at=now() WHERE id=$1",params:[season.id]}
  ]);
  const {rows:newLeagues}=await db.query("SELECT * FROM leagues WHERE season_id=$1",[next.id]); const n1=newLeagues.find(x=>x.division_code==="D1"),n2=newLeagues.find(x=>x.division_code==="D2");
  const div1=[...d1.slice(0,6).map(x=>x.id),...d2.slice(0,2).map(x=>x.id)],div2=[...d2.slice(2).map(x=>x.id),...d1.slice(6).map(x=>x.id)];
  await db.transaction([...div1.map(id=>({sql:"INSERT INTO league_teams (league_id,team_id) VALUES ($1,$2)",params:[n1.id,id]})),...div2.map(id=>({sql:"INSERT INTO league_teams (league_id,team_id) VALUES ($1,$2)",params:[n2.id,id]}))]);
  res.json({season:next,promoted:d2.slice(0,2).map(x=>x.id),relegated:d1.slice(6).map(x=>x.id),message:"Season archived and divisions rolled over. Generate the new fixture lists when ready."});
}