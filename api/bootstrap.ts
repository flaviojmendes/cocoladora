import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "@vercel/postgres";

let initialized = false;

async function ensureTables() {
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
  await sql`
    CREATE TABLE IF NOT EXISTS places (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      clean_rating INTEGER NOT NULL DEFAULT 0,
      facilities_rating INTEGER NOT NULL DEFAULT 0,
      privacy_rating INTEGER NOT NULL DEFAULT 0,
      notes JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS door_messages (
      id VARCHAR(64) PRIMARY KEY,
      message TEXT NOT NULL,
      font_color VARCHAR(32) DEFAULT '#1e1b18',
      font VARCHAR(64) DEFAULT 'Sedgwick Ave',
      rotation REAL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  initialized = true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", ["GET"]);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    await ensureTables();

    const [locationsResult, placesResult, messagesResult] = await Promise.all([
      sql`
        SELECT id, latitude, longitude, city, totalearned, timestarted, timeended, day
        FROM locations
        ORDER BY created_at DESC;
      `,
      sql`
        SELECT id, name, latitude, longitude, clean_rating, facilities_rating, privacy_rating, notes
        FROM places
        ORDER BY created_at DESC;
      `,
      sql`
        SELECT id, message, font_color, font, rotation
        FROM door_messages
        ORDER BY created_at DESC;
      `,
    ]);

    const locations = locationsResult.rows.map((row) => ({
      id: row.id,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      city: row.city || "",
      totalearned: row.totalearned,
      timestarted: row.timestarted || "",
      timeended: row.timeended || "",
      day: row.day || "",
    }));

    const places: { [key: string]: any } = {};
    for (const row of placesResult.rows) {
      let notesArr: string[] = [];
      if (Array.isArray(row.notes)) {
        notesArr = row.notes;
      } else if (typeof row.notes === "string") {
        try {
          const parsed = JSON.parse(row.notes);
          notesArr = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          notesArr = [row.notes];
        }
      }
      places[row.id] = {
        id: row.id,
        name: row.name,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        cleanRating: Number(row.clean_rating) || 0,
        facilitiesRating: Number(row.facilities_rating) || 0,
        privacyRating: Number(row.privacy_rating) || 0,
        notes: notesArr,
      };
    }

    const messages = messagesResult.rows.map((row) => ({
      id: row.id,
      message: row.message,
      fontColor: row.font_color || "#1e1b18",
      font: row.font || "Sedgwick Ave",
      style: {
        transform: `rotate(${row.rotation || 0}deg)`,
      },
    }));

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({ locations, places, messages });
  } catch (error: any) {
    console.error("Error in /api/bootstrap:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
