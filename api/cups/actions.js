import { db } from "hatchable";

export const access = "admin";
export const methods = ["POST"];

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default async function (req, res) {
  const b = req.body || {};

  /* ---------- Record a tie result ---------- */
  if (b.action === "result") {
    if (!b.tie_id || b.home_score === undefined || b.away_score === undefined) {
      return res.status(400).json({ error: "tie_id, home_score and away_score are required" });
    }
    const homeScore = Number(b.home_score);
    const awayScore = Number(b.away_score);
    if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0) {
      return res.status(400).json({ error: "Scores must be whole numbers of 0 or more" });
    }
    const { rows: tieRows } = await db.query(
      `SELECT ct.*, c.format FROM cup_ties ct JOIN competitions c ON c.id = ct.competition_id WHERE ct.id = $1`,
      [b.tie_id]
    );
    const tie = tieRows[0];
    if (!tie) return res.status(404).json({ error: "Tie not found" });

    if (tie.format === "two_leg") {
      // Update this leg; then resolve the aggregate once both legs are in.
      await db.query(
        "UPDATE cup_ties SET home_score=$2, away_score=$3, status='played', played_at=COALESCE($4, played_at, now()) WHERE id=$1",
        [tie.id, homeScore, awayScore, b.played_at || null]
      );
      const { rows: legs } = await db.query(
        `SELECT * FROM cup_ties WHERE competition_id=$1 AND round_name=$2 AND tie_number=$3 ORDER BY leg_number`,
        [tie.competition_id, tie.round_name, tie.tie_number]
      );
      if (legs.length < 2) {
        return res.status(400).json({ error: "Two-leg ties require both legs; this tie has only one." });
      }
      const [leg1, leg2] = legs;
      if (leg1.status !== "played" || leg2.status !== "played") {
        return res.json({ ok: true, message: "Leg recorded. The aggregate resolves once both legs are played." });
      }
      const totalHome = leg1.home_score + leg2.away_score; // team that was home in leg 1
      const totalAway = leg1.away_score + leg2.home_score; // team that was away in leg 1
      let winnerId;
      if (totalHome > totalAway) winnerId = leg1.home_team_id;
      else if (totalAway > totalHome) winnerId = leg1.away_team_id;
      else {
        // Aggregate level: away-goals rule decides; otherwise the admin picks (penalties/replay).
        const awayGoalsHome = leg2.away_score;
        const awayGoalsAway = leg1.away_score;
        if (awayGoalsHome > awayGoalsAway) winnerId = leg1.home_team_id;
        else if (awayGoalsAway > awayGoalsHome) winnerId = leg1.away_team_id;
        else {
          if (!b.winner_team_id) {
            return res.status(400).json({ error: "Aggregate and away goals are level — pass winner_team_id (e.g. after penalties)." });
          }
          if (String(b.winner_team_id) !== String(leg1.home_team_id) && String(b.winner_team_id) !== String(leg1.away_team_id)) {
            return res.status(400).json({ error: "winner_team_id must be one of the two teams in the tie." });
          }
          winnerId = Number(b.winner_team_id);
        }
      }
      await db.query(
        "UPDATE cup_ties SET winner_team_id=$2 WHERE id=$1 OR id=$3",
        [leg1.id, winnerId, leg2.id]
      );
      return res.json({ ok: true, message: "Tie resolved — a winner advances on aggregate." });
    }

    // Single-leg knockout
    let winnerId = homeScore > awayScore ? tie.home_team_id : awayScore > homeScore ? tie.away_team_id : null;
    if (!winnerId) {
      if (!b.winner_team_id) {
        return res.status(400).json({ error: "The match ended level — pass winner_team_id (e.g. after penalties)." });
      }
      if (String(b.winner_team_id) !== String(tie.home_team_id) && String(b.winner_team_id) !== String(tie.away_team_id)) {
        return res.status(400).json({ error: "winner_team_id must be one of the two teams in the tie." });
      }
      winnerId = Number(b.winner_team_id);
    }
    await db.query(
      "UPDATE cup_ties SET home_score=$2, away_score=$3, winner_team_id=$4, status='played', played_at=COALESCE($5, played_at, now()) WHERE id=$1",
      [tie.id, homeScore, awayScore, winnerId, b.played_at || null]
    );
    return res.json({ ok: true, message: "Result recorded; the winner advances." });
  }

  /* ---------- Draw the next round from previous winners ---------- */
  if (b.action === "draw") {
    const { competition_id, round_name } = b;
    if (!competition_id || !round_name) {
      return res.status(400).json({ error: "competition_id and round_name are required" });
    }
    const { rows: compRows } = await db.query("SELECT * FROM competitions WHERE id = $1", [competition_id]);
    const comp = compRows[0];
    if (!comp) return res.status(404).json({ error: "Competition not found" });
    if (!["single_elimination", "two_leg"].includes(comp.format)) {
      return res.status(400).json({ error: "Only knockout competitions use cup draws." });
    }
    const { rows: existing } = await db.query(
      "SELECT id FROM cup_ties WHERE competition_id = $1 AND round_name = $2 LIMIT 1",
      [competition_id, round_name]
    );
    if (existing[0]) return res.status(409).json({ error: "That round has already been drawn." });

    // Participants: winners of the previous round (if any) or all entered clubs.
    const { rows: roundNames } = await db.query(
      "SELECT DISTINCT round_name, MIN(id) AS first_id FROM cup_ties WHERE competition_id = $1 GROUP BY round_name ORDER BY MIN(id)",
      [competition_id]
    );
    let participantIds;
    if (roundNames.length) {
      const prevRound = roundNames[roundNames.length - 1].round_name;
      const { rows: unfinished } = await db.query(
        "SELECT id FROM cup_ties WHERE competition_id = $1 AND round_name = $2 AND status <> 'played' LIMIT 1",
        [competition_id, prevRound]
      );
      if (unfinished[0]) {
        return res.status(409).json({ error: `All ties in "${prevRound}" must be completed before the next draw.` });
      }
      const { rows: winners } = await db.query(
        "SELECT DISTINCT winner_team_id FROM cup_ties WHERE competition_id = $1 AND round_name = $2 AND winner_team_id IS NOT NULL",
        [competition_id, prevRound]
      );
      participantIds = winners.map((w) => w.winner_team_id);
    } else {
      const { rows: entries } = await db.query(
        "SELECT team_id FROM competition_entries WHERE competition_id = $1",
        [competition_id]
      );
      participantIds = entries.map((e) => e.team_id);
    }
    if (participantIds.length < 2 || participantIds.length % 2 !== 0) {
      return res.status(400).json({ error: "This round needs an even number of qualified clubs." });
    }

    const shuffled = shuffle(participantIds);
    const statements = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      const n = i / 2 + 1;
      statements.push({
        sql: "INSERT INTO cup_ties (competition_id,round_name,tie_number,leg_number,home_team_id,away_team_id) VALUES ($1,$2,$3,1,$4,$5)",
        params: [competition_id, round_name, n, shuffled[i], shuffled[i + 1]]
      });
      if (comp.format === "two_leg") {
        statements.push({
          sql: "INSERT INTO cup_ties (competition_id,round_name,tie_number,leg_number,home_team_id,away_team_id) VALUES ($1,$2,$3,2,$4,$5)",
          params: [competition_id, round_name, n, shuffled[i + 1], shuffled[i]]
        });
      }
    }
    await db.transaction(statements);
    await db.query("UPDATE competitions SET status='active' WHERE id=$1", [competition_id]);
    return res.json({
      message: `${shuffled.length / 2} tie${shuffled.length / 2 > 1 ? "s" : ""} drawn in ${round_name}${comp.format === "two_leg" ? " (two legs)" : ""}.`,
      ties: shuffled.length / 2
    });
  }

  return res.status(400).json({ error: "Unknown cup action" });
}
