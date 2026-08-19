import { db } from "hatchable";
export const access = "admin";
export const methods = ["POST"];

export default async function (req, res) {
  const { season_name, minimum_rating_apps } = req.body || {};
  if (!season_name || !String(season_name).trim()) return res.status(400).json({ error: "season_name is required" });
  const { rows: active } = await db.query("SELECT id FROM seasons WHERE status = 'active' LIMIT 1");
  if (active[0]) return res.status(409).json({ error: "An active TSW season already exists. Archive or roll it over first." });
  const { rows: seasons } = await db.query(
    "INSERT INTO seasons (name, minimum_rating_apps) VALUES ($1,$2) RETURNING *",
    [String(season_name).trim(), Number(minimum_rating_apps) || 3]
  );
  const season = seasons[0];
  const definitions = [
    ["TSW Division 1","D1","league","D1"],
    ["TSW Division 2","D2","league","D2"],
    ["TSW Division 3","D3","league","D3"],
    ["TSW Division 4","D4","league","D4"],
    ["TSW Cup","CUP","single_elimination",null],
    ["TSW Shield","SHIELD","two_leg","D1"],
    ["TSW Plate","PLATE","single_elimination","D2"]
  ];
  const statements = definitions.map(([name, code, format, scope]) => ({
    sql: "INSERT INTO competitions (season_id,name,code,format,division_scope) VALUES ($1,$2,$3,$4,$5)",
    params: [season.id,name,code,format,scope]
  }));
  // Division pyramid: D1 champions; D1-D3 relegate their bottom two up/down,
  // D2-D4 promote their top two. 8 clubs per division, single round robin.
  const divisions = [
    ["TSW Division 1","D1",2,0],
    ["TSW Division 2","D2",2,2],
    ["TSW Division 3","D3",2,2],
    ["TSW Division 4","D4",0,2]
  ];
  divisions.forEach(([name, code, rel, promo]) => {
    statements.push({sql:"INSERT INTO leagues (name,season,format,relegation_spots,promotion_spots,season_id,division_code) VALUES ($1,$2,'single_round_robin',$3,$4,$5,$6)",params:[name,season.name,rel,promo,season.id,code]});
  });
  await db.transaction(statements);
  const { rows: leagues } = await db.query("SELECT id,name,division_code FROM leagues WHERE season_id = $1 ORDER BY division_code",[season.id]);
  res.json({ season, leagues, message:"TSW season created with empty Divisions 1–4 and the cup competitions. Add clubs before generating fixtures or draws." });
}
