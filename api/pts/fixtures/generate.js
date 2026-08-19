import { db } from "hatchable";
export const access = "admin";
export const methods = ["POST"];

function circle(teams) {
  const a = [...teams], rounds = [];
  for (let r = 0; r < a.length - 1; r++) {
    const games = [];
    for (let i = 0; i < a.length / 2; i++) games.push([a[i], a[a.length - 1 - i]]);
    rounds.push(games);
    a.splice(1, 0, a.pop());
  }
  return rounds;
}
export default async function (req, res) {
  const { league_id } = req.body || {};
  if (!league_id) return res.status(400).json({ error:"league_id is required" });
  const { rows: leagueRows } = await db.query("SELECT * FROM leagues WHERE id = $1",[league_id]);
  const league = leagueRows[0];
  if (!league || !["D1","D2","D3","D4"].includes(league.division_code)) return res.status(400).json({ error:"Choose a TSW Division league." });
  const { rows: teams } = await db.query("SELECT team_id FROM league_teams WHERE league_id = $1 ORDER BY team_id",[league_id]);
  if (teams.length !== 8) return res.status(400).json({ error:"Each TSW division needs exactly 8 clubs before its 7-gameweek fixture list can be generated." });
  const { rows: existing } = await db.query("SELECT id FROM matches WHERE league_id = $1 LIMIT 1",[league_id]);
  if (existing[0]) return res.status(409).json({ error:"Fixtures already exist for this division." });
  const rounds = circle(teams.map(x => x.team_id));
  const statements = [];
  rounds.forEach((games, r) => games.forEach(([home,away],i) => statements.push({
    sql:"INSERT INTO matches (league_id,home_team_id,away_team_id,matchweek,status) VALUES ($1,$2,$3,$4,'pending')",
    params:[league_id, r % 2 === 0 || i % 2 === 0 ? home : away, r % 2 === 0 || i % 2 === 0 ? away : home, r+1]
  })));
  await db.transaction(statements);
  res.json({ gameweeks:7, matches:28, message:"Seven single round-robin gameweeks generated." });
}