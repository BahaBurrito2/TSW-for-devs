import { db } from "hatchable";
import { withMedia, withMediaMany } from "../../lib/media.js";
export const access = "public";
export const methods = ["GET"];

export default async function(req,res) {
  const { player_id }=req.query;
  if(!player_id)return res.status(400).json({error:"player_id is required"});
  const {rows:baseRows}=await db.query("SELECT p.*,t.name team_name,t.crest_url FROM players p LEFT JOIN teams t ON t.id=p.team_id WHERE p.id=$1",[player_id]);
  if(!baseRows[0])return res.status(404).json({error:"Player not found"});
  const [all,season,awards,movements]=await Promise.all([
    db.query("SELECT count(*)::int apps,coalesce(sum(goals),0)::int goals,coalesce(sum(assists),0)::int assists,coalesce(sum(clean_sheet::int),0)::int clean_sheets,coalesce(sum(yellow_cards),0)::int yellow_cards,coalesce(sum(red_cards),0)::int red_cards,round(avg(rating),2) avg_rating FROM player_ratings WHERE player_id=$1",[player_id]),
    db.query("SELECT count(*)::int apps,coalesce(sum(pr.goals),0)::int goals,coalesce(sum(pr.assists),0)::int assists,coalesce(sum(pr.clean_sheet::int),0)::int clean_sheets,coalesce(sum(pr.yellow_cards),0)::int yellow_cards,coalesce(sum(pr.red_cards),0)::int red_cards,round(avg(pr.rating),2) avg_rating FROM player_ratings pr JOIN matches m ON m.id=pr.match_id JOIN leagues l ON l.id=m.league_id JOIN seasons s ON s.id=l.season_id WHERE pr.player_id=$1 AND s.status='active'",[player_id]),
    db.query("SELECT aa.id,aa.awarded_at,aa.note,a.name,a.icon_url,a.color,a.scope,s.name season_name FROM award_assignments aa JOIN awards a ON a.id=aa.award_id LEFT JOIN seasons s ON s.id=aa.season_id WHERE aa.player_id=$1 ORDER BY aa.awarded_at DESC",[player_id]),
    db.query("SELECT h.*,f.name from_team_name,f.crest_url from_crest_url,t.name to_team_name,t.crest_url to_crest_url FROM player_club_history h LEFT JOIN teams f ON f.id=h.from_team_id LEFT JOIN teams t ON t.id=h.to_team_id WHERE h.player_id=$1 ORDER BY h.moved_at DESC",[player_id])
  ]);
  const player=await withMedia(baseRows[0],["avatar_url","crest_url"]);
  res.json({player,current_season:season.rows[0],all_time:all.rows[0],awards:await withMediaMany(awards.rows,["icon_url"]),transfer_history:await withMediaMany(movements.rows,["from_crest_url","to_crest_url"])});
}