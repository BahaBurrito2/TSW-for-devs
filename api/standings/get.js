import { db } from "hatchable";
import { withMediaMany } from "../../lib/media.js";
export const access = "public";
export const methods = ["GET"];

export default async function (req, res) {
  const { league_id } = req.query;
  if (!league_id) return res.status(400).json({ error:"league_id is required" });
  const { rows: leagues } = await db.query("SELECT * FROM leagues WHERE id = $1",[league_id]);
  const league=leagues[0]; if(!league) return res.status(404).json({error:"league not found"});
  const { rows: teamsRaw } = await db.query("SELECT t.id,t.name,t.crest_url FROM league_teams lt JOIN teams t ON t.id=lt.team_id WHERE lt.league_id=$1",[league_id]);
  const teams = await withMediaMany(teamsRaw, ["crest_url"]);
  const { rows: matches } = await db.query("SELECT * FROM matches WHERE league_id=$1 AND status='played' ORDER BY matchweek,id",[league_id]);
  const rows=teams.map(t=>({team_id:t.id,name:t.name,crest_url:t.crest_url,played:0,won:0,drawn:0,lost:0,gf:0,ga:0,pts:0,last5:[]}));
  const byId=Object.fromEntries(rows.map(r=>[r.team_id,r]));
  for(const m of matches){
    const h=byId[m.home_team_id], a=byId[m.away_team_id]; if(!h||!a) continue;
    h.played++;a.played++;h.gf+=m.home_score;h.ga+=m.away_score;a.gf+=m.away_score;a.ga+=m.home_score;
    const hr=m.home_score>m.away_score?"W":m.home_score===m.away_score?"D":"L", ar=hr==="W"?"L":hr==="L"?"W":"D";
    h[hr==="W"?"won":hr==="D"?"drawn":"lost"]++;a[ar==="W"?"won":ar==="D"?"drawn":"lost"]++;
    h.pts+=hr==="W"?3:hr==="D"?1:0;a.pts+=ar==="W"?3:ar==="D"?1:0;
    h.last5.push(hr);a.last5.push(ar);
  }
  rows.forEach(r=>{r.gd=r.gf-r.ga;r.last5=r.last5.slice(-5).reverse();});
  const base=(a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf;
  rows.sort(base);
  let start=0;
  while(start<rows.length){
    let end=start+1; while(end<rows.length && base(rows[start],rows[end])===0) end++;
    if(end-start>1){
      const group=rows.slice(start,end), ids=group.map(x=>x.team_id), mini=Object.fromEntries(ids.map(id=>[id,{pts:0,gd:0,gf:0}]));
      for(const m of matches) if(ids.includes(m.home_team_id)&&ids.includes(m.away_team_id)){
        const h=mini[m.home_team_id],a=mini[m.away_team_id];h.gf+=m.home_score;h.gd+=m.home_score-m.away_score;a.gf+=m.away_score;a.gd+=m.away_score-m.home_score;
        if(m.home_score>m.away_score)h.pts+=3;else if(m.home_score<m.away_score)a.pts+=3;else{h.pts++;a.pts++;}
      }
      group.sort((a,b)=>mini[b.team_id].pts-mini[a.team_id].pts||mini[b.team_id].gd-mini[a.team_id].gd||mini[b.team_id].gf-mini[a.team_id].gf||a.name.localeCompare(b.name));
      rows.splice(start,group.length,...group);
    } start=end;
  }
  const table=rows.map((r,i)=>({...r,position:i+1,zone:i===0?"champion":league.division_code==="D2"&&i<2?"promotion":league.division_code==="D1"&&i>=6?"relegation":null}));
  const unresolved=table.filter((r,i)=>i&&r.pts===table[i-1].pts&&r.gd===table[i-1].gd&&r.gf===table[i-1].gf);
  res.json({league,table,playoff_may_be_required:unresolved.length>0});
}