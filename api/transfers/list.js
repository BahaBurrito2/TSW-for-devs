import { db } from "hatchable";
import { withMediaMany } from "../../lib/media.js";

export const access = "public";
export const methods = ["GET"];

const SORTS = {
  date: "tr.created_at DESC",
  player_name: "p.name ASC",
  club: "tt.name ASC"
};

export default async function (req, res) {
  const { status, to_team_id, position, transfer_type, sort } = req.query;
  const clauses = [];
  const params = [];
  if (status) { params.push(status); clauses.push(`tr.status = $${params.length}`); }
  if (to_team_id) { params.push(to_team_id); clauses.push(`tr.to_team_id = $${params.length}`); }
  if (position) { params.push(position); clauses.push(`p.position = $${params.length}`); }
  if (transfer_type) { params.push(transfer_type); clauses.push(`tr.transfer_type = $${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const orderBy = SORTS[sort] || SORTS.date;

  const { rows } = await db.query(
    `SELECT tr.*, p.name AS player_name, p.position, p.avatar_url,
       ft.id AS from_team_id, ft.name AS from_team_name, ft.crest_url AS from_crest_url,
       tt.id AS to_team_id, tt.name AS to_team_name, tt.crest_url AS to_crest_url
     FROM transfers tr
     JOIN players p ON p.id = tr.player_id
     LEFT JOIN teams ft ON ft.id = tr.from_team_id
     LEFT JOIN teams tt ON tt.id = tr.to_team_id
     ${where}
     ORDER BY ${orderBy}`,
    params
  );
  res.json(await withMediaMany(rows, ["avatar_url", "from_crest_url", "to_crest_url"]));
}