import { db } from "hatchable";
export const access = "admin";
export const methods = ["POST"];

export default async function (req, res) {
  const { season_name, minimum_rating_apps } = req.body || {};
  if (!season_name || !String(season_name).trim()) return res.status(400).json({ error: "season_name is required" });
  const { rows: active } = await db.query("SELECT id FROM seasons WHERE status = 'active' LIMIT 1");
  if (active[0]) return res.status(409).json({ error: "An active PTS season already exists. Archive or roll it over first." });
  const { rows: seasons } = await db.query(
    "INSERT INTO seasons (name, minimum_rating_apps) VALUES ($1,$2) RETURNING *",
    [String(season_name).trim(), Number(minimum_rating_apps) || 3]
  );
  const season = seasons[0];
  const definitions = [
    ["PTS Division 1","D1","league","D1"],
    ["PTS Division 2","D2","league","D2"],
    ["PTS Cup","CUP","single_elimination",null],
    ["PTS Champions League","UCL","two_leg","D1"],
    ["PTS Europa League","UEL","single_elimination","D2"]
  ];
  const statements = definitions.map(([name, code, format, scope]) => ({
    sql: "INSERT INTO competitions (season_id,name,code,format,division_scope) VALUES ($1,$2,$3,$4,$5)",
    params: [season.id,name,code,format,scope]
  }));
  statements.push({sql:"INSERT INTO leagues (name,season,format,relegation_spots,promotion_spots,season_id,division_code) VALUES ($1,$2,'single_round_robin',2,0,$3,'D1')",params:["PTS Division 1",season.name,season.id]});
  statements.push({sql:"INSERT INTO leagues (name,season,format,relegation_spots,promotion_spots,season_id,division_code) VALUES ($1,$2,'single_round_robin',0,2,$3,'D2')",params:["PTS Division 2",season.name,season.id]});
  await db.transaction(statements);
  const { rows: leagues } = await db.query("SELECT id,name,division_code FROM leagues WHERE season_id = $1 ORDER BY division_code",[season.id]);
  res.json({ season, leagues, message:"PTS season created with empty Divisions 1 & 2 and all three cup competitions. Add clubs before generating fixtures or draws." });
}