import { createHash, timingSafeEqual } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "@vercel/postgres";

let initialized = false;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function hashesMatch(actual: string, expected: string | null): boolean {
  if (!actual || !expected) return false;
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function readOwnerToken(req: VercelRequest): string {
  const header = req.headers["x-location-owner"];
  if (typeof header === "string") return header;
  return typeof req.body?.ownerToken === "string" ? req.body.ownerToken : "";
}

function publicLocation(row: any, ownerHash = "") {
  return {
    id: row.id,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    city: row.city || "",
    totalearned: row.totalearned,
    timestarted: row.timestarted || "",
    timeended: row.timeended || "",
    day: row.day || "",
    mine: hashesMatch(ownerHash, row.owner_hash),
  };
}

async function ensureTable() {
  if (initialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS locations (
      id SERIAL PRIMARY KEY,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      city VARCHAR(255),
      totalearned VARCHAR(64) NOT NULL,
      timestarted VARCHAR(32),
      timeended VARCHAR(32),
      day VARCHAR(32),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await sql`ALTER TABLE locations ADD COLUMN IF NOT EXISTS owner_hash VARCHAR(64);`;
  initialized = true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureTable();
    const ownerToken = readOwnerToken(req);
    const ownerHash = ownerToken ? hashToken(ownerToken) : "";
    const mineOnly = String(req.query.mine || "") === "1";

    if (req.method === "GET") {
      if (mineOnly) {
        if (!ownerHash) return res.status(400).json({ error: "Identidade ausente." });
        res.setHeader("Cache-Control", "private, no-store");
        const { rows } = await sql`
          SELECT id FROM locations WHERE owner_hash = ${ownerHash} ORDER BY created_at DESC;
        `;
        return res.status(200).json({ ids: rows.map((row) => row.id) });
      }

      const { rows } = await sql`
        SELECT id, latitude, longitude, city, totalearned, timestarted, timeended, day, owner_hash, created_at
        FROM locations
        ORDER BY created_at DESC;
      `;

      res.setHeader("Cache-Control", ownerHash ? "private, no-store" : "s-maxage=60, stale-while-revalidate=300");
      return res.status(200).json(rows.map((row) => publicLocation(row, ownerHash)));
    }

    if (req.method === "POST") {
      if (ownerToken.length < 16 || ownerToken.length > 128) {
        return res.status(400).json({ error: "Identidade inválida." });
      }

      const { latitude, longitude, city, totalearned, timestarted, timeended, day } = req.body || {};

      if (latitude === undefined || longitude === undefined || !totalearned) {
        return res.status(400).json({ error: "Missing required fields: latitude, longitude, totalearned" });
      }

      const latNum = parseFloat(latitude);
      const lngNum = parseFloat(longitude);
      const safeCity = typeof city === "string" ? city.slice(0, 255) : "";
      const safeTotalEarned = String(totalearned).slice(0, 64);
      const safeTimeStarted = typeof timestarted === "string" ? timestarted.slice(0, 32) : "";
      const safeTimeEnded = typeof timeended === "string" ? timeended.slice(0, 32) : "";
      const safeDay = typeof day === "string" ? day.slice(0, 32) : "";

      const { rows } = await sql`
        INSERT INTO locations (latitude, longitude, city, totalearned, timestarted, timeended, day, owner_hash)
        VALUES (${latNum}, ${lngNum}, ${safeCity}, ${safeTotalEarned}, ${safeTimeStarted}, ${safeTimeEnded}, ${safeDay}, ${ownerHash})
        RETURNING id, latitude, longitude, city, totalearned, timestarted, timeended, day, owner_hash, created_at;
      `;

      return res.status(201).json(publicLocation(rows[0], ownerHash));
    }

    if (req.method === "DELETE") {
      if (ownerToken.length < 16 || ownerToken.length > 128) {
        return res.status(400).json({ error: "Identidade inválida." });
      }

      if (mineOnly) {
        const { rows } = await sql`
          DELETE FROM locations WHERE owner_hash = ${ownerHash} RETURNING id;
        `;
        return res.status(200).json({ success: true, deleted: rows.length });
      }

      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: "Missing required query parameter: id" });
      }
      const idNum = parseInt(String(id), 10);
      if (isNaN(idNum)) {
        return res.status(400).json({ error: "Invalid location id" });
      }

      const existing = await sql`
        SELECT owner_hash FROM locations WHERE id = ${idNum};
      `;
      if (!existing.rows[0]) {
        return res.status(404).json({ error: "Registro não encontrado." });
      }
      if (!hashesMatch(ownerHash, existing.rows[0].owner_hash)) {
        return res.status(403).json({ error: "Este registro não é seu." });
      }

      await sql`DELETE FROM locations WHERE id = ${idNum} AND owner_hash = ${ownerHash};`;
      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error: any) {
    console.error("Error in /api/locations:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
