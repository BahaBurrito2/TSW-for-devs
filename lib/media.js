import { storage } from "hatchable";

// storage.put only returns a URL valid for ~1h. Every image field in this
// app (player avatar_url, team crest_url/secondary_crest_url, award
// icon_url) stores EITHER a full external http(s) URL (pasted by an admin)
// OR a bare storage key returned by /api/media/upload (e.g. "media/abc.jpg").
// Callers must resolve the stored value to a fresh signed URL at read time.

const TTL = 7 * 24 * 60 * 60; // 7 days — the max storage.url supports

export async function mediaUrl(value) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  try {
    return await storage.url(value, { ttl: TTL });
  } catch (e) {
    return null;
  }
}

// Resolve one or more image fields on a single row for DISPLAY. Also stashes
// the original stored value under `<field>_raw` (unchanged — key or URL) so
// edit forms can round-trip it without re-storing a temporary signed URL as
// if it were durable. Returns a new object; safe on null/undefined.
export async function withMedia(row, fields) {
  if (!row) return row;
  const out = { ...row };
  await Promise.all(fields.map(async (f) => {
    if (f in out) {
      out[f + "_raw"] = out[f];
      out[f] = await mediaUrl(out[f]);
    }
  }));
  return out;
}

// Resolve image fields across an array of rows.
export async function withMediaMany(rows, fields) {
  return Promise.all((rows || []).map((r) => withMedia(r, fields)));
}