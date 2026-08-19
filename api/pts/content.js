import { db } from "hatchable";
import { withMediaMany } from "../../lib/media.js";
export const access = "admin";

export default async function(req,res) {
  const b=req.method==="GET"?req.query:(req.body||{}), action=b.action;
  if(action==="news_list"){const {rows}=await db.query("SELECT * FROM news_posts ORDER BY featured DESC,published_at DESC NULLS LAST,created_at DESC");return res.json(rows);}
  if(action==="news_delete"){if(!b.id||b.confirmation!=="DELETE")return res.status(400).json({error:"Type DELETE to confirm news removal."});const {rows}=await db.query("DELETE FROM news_posts WHERE id=$1 RETURNING id",[b.id]);if(!rows[0])return res.status(404).json({error:"News post not found"});return res.json({ok:true});}
  if(action==="news_save"){if(!b.title||!b.body)return res.status(400).json({error:"title and body are required"});const {rows}=await db.query("INSERT INTO news_posts (title,body,category,cover_url,status,featured,published_at) VALUES ($1,$2,$3,$4,$5,$6,CASE WHEN $5='published' THEN now() ELSE NULL END) RETURNING *",[b.title,b.body,b.category||"Announcement",b.cover_url||null,b.status||"draft",!!b.featured]);return res.json(rows[0]);}
  if(action==="news_update"){if(!b.id||!b.title||!b.body)return res.status(400).json({error:"id, title and body are required"});const {rows}=await db.query("UPDATE news_posts SET title=$2,body=$3,category=$4,cover_url=$5,featured=$6,updated_at=now() WHERE id=$1 RETURNING *",[b.id,b.title,b.body,b.category||"Announcement",b.cover_url||null,!!b.featured]);if(!rows[0])return res.status(404).json({error:"News post not found"});return res.json(rows[0]);}
  if(action==="awards_list"){const {rows}=await db.query("SELECT a.*,count(aa.id)::int winners FROM awards a LEFT JOIN award_assignments aa ON aa.award_id=a.id GROUP BY a.id ORDER BY a.name");return res.json(await withMediaMany(rows,["icon_url"]));}
  if(action==="award_save"){if(!b.name||!b.award_type||!b.scope)return res.status(400).json({error:"name, award_type and scope are required"});const {rows}=await db.query("INSERT INTO awards (name,description,icon_url,color,award_type,scope) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",[b.name,b.description||null,b.icon_url||null,b.color||"#d4af37",b.award_type,b.scope]);return res.json(rows[0]);}
  if(action==="award_update"){if(!b.id||!b.name)return res.status(400).json({error:"id and name are required"});const {rows}=await db.query("UPDATE awards SET name=$2,description=$3,icon_url=$4,color=$5 WHERE id=$1 RETURNING *",[b.id,b.name,b.description||null,b.icon_url||null,b.color||"#d4af37"]);if(!rows[0])return res.status(404).json({error:"Award not found"});return res.json(rows[0]);}
  if(action==="award_assign"){
    if(!b.award_id||(!b.player_id&&!b.team_id)||(b.player_id&&b.team_id))return res.status(400).json({error:"Choose exactly one player or club and an award."});
    let seasonId=b.season_id;
    if(seasonId===undefined){const {rows:s}=await db.query("SELECT id FROM seasons WHERE status='active' LIMIT 1");seasonId=s[0]?s[0].id:null;}
    const {rows}=await db.query("INSERT INTO award_assignments (award_id,player_id,team_id,season_id,awarded_at,note) VALUES ($1,$2,$3,$4,COALESCE($5,CURRENT_DATE),$6) RETURNING *",[b.award_id,b.player_id||null,b.team_id||null,seasonId||null,b.awarded_at||null,b.note||null]);
    return res.json(rows[0]);
  }
  if(action==="award_unassign"){if(!b.id)return res.status(400).json({error:"id is required"});await db.query("DELETE FROM award_assignments WHERE id=$1",[b.id]);return res.json({message:"Award removed from winner."});}
  return res.status(400).json({error:"Unknown content action"});
}