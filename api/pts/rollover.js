import { db } from "hatchable";
export const access = "admin";
export const methods = ["POST"];

export default async function(req,res) {
  const { season_id, next_season_name }=req.body||{};
  if(!season_id||!next_season_name) return res.status(400).json({error:"season_id and next_season_name are required"});
  const {rows: seasonRows}=await db.query("SELECT * FROM seasons WHERE id=$1 AND status='active'",[season_id]); const season=seasonRows[0];
  if(!season)return res.status(404).json({error:"Active season not found"});
  const {rows: leagues}=await db.query("SELECT * FROM leagues WHERE season_id=$1 ORDER BY division_code",[season_id]);
  const codes=["D1","D2","D3","D4"];
  if(leagues.length!==4||!codes.every(c=>leagues.some(l=>l.division_code===c)))return res.status(400).json({error:"Season must have Divisions 1–4."});
  for(const league of leagues){
    const {rows}=await db.query("SELECT count(*)::int AS count FROM matches WHERE league_id=$1 AND status='played'",[league.id]);
    if(rows[0].count!==28)return res.status(400).json({error:"All 28 matches in every division must be recorded before rollover."});
  }
  const rank=async league=>{
    const {rows}=await db.query(
      `WITH x AS (
         SELECT home_team_id id,home_score gf,away_score ga FROM matches WHERE league_id=$1
         UNION ALL
         SELECT away_team_id,away_score,home_score FROM matches WHERE league_id=$1
       ) SELECT id, SUM(CASE WHEN gf>ga THEN 3 WHEN gf=ga THEN 1 ELSE 0 END)::int pts, SUM(gf-ga)::int gd, SUM(gf)::int gf
       FROM x GROUP BY id ORDER BY pts DESC,gd DESC,gf DESC`,
      [league.id]
    );
    if(rows.length!==8)throw Error("Each division must have exactly eight clubs.");
    return rows;
  };
  const d={};
  for(const code of codes){
    const league=leagues.find(l=>l.division_code===code);
    d[code]=await rank(league);
  }
  const {rows:newRows}=await db.query("INSERT INTO seasons (name,minimum_rating_apps) VALUES ($1,$2) RETURNING *",[next_season_name,season.minimum_rating_apps]);const next=newRows[0];

  // New division membership (8 clubs each). Between every adjacent pair the
  // bottom two swap with the top two.
  const nextD1=[...d.D1.slice(0,6).map(x=>x.id),...d.D2.slice(0,2).map(x=>x.id)];
  const nextD2=[...d.D2.slice(2,6).map(x=>x.id),...d.D1.slice(6).map(x=>x.id),...d.D3.slice(0,2).map(x=>x.id)];
  const nextD3=[...d.D3.slice(2,6).map(x=>x.id),...d.D2.slice(6).map(x=>x.id),...d.D4.slice(0,2).map(x=>x.id)];
  const nextD4=[...d.D4.slice(2).map(x=>x.id),...d.D3.slice(6).map(x=>x.id)];

  await db.transaction([
    {sql:"INSERT INTO leagues (name,season,format,relegation_spots,promotion_spots,season_id,division_code) VALUES ('TSW Division 1',$1,'single_round_robin',2,0,$2,'D1')",params:[next.name,next.id]},
    {sql:"INSERT INTO leagues (name,season,format,relegation_spots,promotion_spots,season_id,division_code) VALUES ('TSW Division 2',$1,'single_round_robin',2,2,$2,'D2')",params:[next.name,next.id]},
    {sql:"INSERT INTO leagues (name,season,format,relegation_spots,promotion_spots,season_id,division_code) VALUES ('TSW Division 3',$1,'single_round_robin',2,2,$2,'D3')",params:[next.name,next.id]},
    {sql:"INSERT INTO leagues (name,season,format,relegation_spots,promotion_spots,season_id,division_code) VALUES ('TSW Division 4',$1,'single_round_robin',0,2,$2,'D4')",params:[next.name,next.id]},
    ...[["TSW Division 1","D1","league","D1"],["TSW Division 2","D2","league","D2"],["TSW Division 3","D3","league","D3"],["TSW Division 4","D4","league","D4"],["TSW Cup","CUP","single_elimination",null],["TSW Shield","SHIELD","two_leg","D1"],["TSW Plate","PLATE","single_elimination","D2"]].map(x=>({sql:"INSERT INTO competitions (season_id,name,code,format,division_scope) VALUES ($1,$2,$3,$4,$5)",params:[next.id,...x]})),
    {sql:"UPDATE seasons SET status='archived',archived_at=now() WHERE id=$1",params:[season.id]}
  ]);
  const {rows:newLeagues}=await db.query("SELECT * FROM leagues WHERE season_id=$1",[next.id]);
  const byCode=c=>newLeagues.find(x=>x.division_code===c).id;
  const membership=[[nextD1,"D1"],[nextD2,"D2"],[nextD3,"D3"],[nextD4,"D4"]];
  const statements=[];
  for(const [ids,code] of membership) for(const id of ids) statements.push({sql:"INSERT INTO league_teams (league_id,team_id) VALUES ($1,$2)",params:[byCode(code),id]});
  await db.transaction(statements);

  res.json({
    season:next,
    promoted:[...d.D2.slice(0,2).map(x=>x.id),...d.D3.slice(0,2).map(x=>x.id),...d.D4.slice(0,2).map(x=>x.id)],
    relegated:[...d.D1.slice(6).map(x=>x.id),...d.D2.slice(6).map(x=>x.id),...d.D3.slice(6).map(x=>x.id)],
    message:"Season archived and Divisions 1–4 rolled over with promotion/relegation applied. Generate the new fixture lists when ready."
  });
}
