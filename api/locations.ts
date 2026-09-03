import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "@vercel/postgres";

let initialized = false;

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
  initialized = true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureTable();

    if (req.method === "GET") {
      const { rows } = await sql`
        SELECT id, latitude, longitude, city, totalearned, timestarted, timeended, day, created_at
        FROM locations
        ORDER BY created_at DESC;
      `;

      const locations = rows.map((row) => ({
        id: row.id,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        city: row.city || "",
        totalearned: row.totalearned,
        timestarted: row.timestarted || "",
        timeended: row.timeended || "",
        day: row.day || "",
      }));

      return res.status(200).json(locations);
    }

    if (req.method === "POST") {
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
        INSERT INTO locations (latitude, longitude, city, totalearned, timestarted, timeended, day)
        VALUES (${latNum}, ${lngNum}, ${safeCity}, ${safeTotalEarned}, ${safeTimeStarted}, ${safeTimeEnded}, ${safeDay})
        RETURNING id, latitude, longitude, city, totalearned, timestarted, timeended, day, created_at;
      `;

      const inserted = rows[0];
      return res.status(201).json({
        id: inserted.id,
        latitude: Number(inserted.latitude),
        longitude: Number(inserted.longitude),
        city: inserted.city,
        totalearned: inserted.totalearned,
        timestarted: inserted.timestarted,
        timeended: inserted.timeended,
        day: inserted.day,
      });
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: "Missing required query parameter: id" });
      }
      const idNum = parseInt(String(id), 10);
      if (isNaN(idNum)) {
        return res.status(400).json({ error: "Invalid location id" });
      }
      await sql`DELETE FROM locations WHERE id = ${idNum};`;
      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error: any) {
    console.error("Error in /api/locations:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
