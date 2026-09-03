import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ensureTables, sql } from "./_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureTables();

    if (req.method === "GET") {
      const { rows } = await sql`
        SELECT id, name, latitude, longitude, clean_rating, facilities_rating, privacy_rating, notes, created_at
        FROM places
        ORDER BY created_at DESC;
      `;

      const placesMap: { [key: string]: any } = {};

      for (const row of rows) {
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

        placesMap[row.id] = {
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

      return res.status(200).json(placesMap);
    }

    if (req.method === "POST") {
      const { id, name, latitude, longitude, cleanRating, facilitiesRating, privacyRating, notes } = req.body || {};

      if (!name || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: "Missing required fields: name, latitude, longitude" });
      }

      const placeId = id || `place-${Date.now()}`;
      const safeName = String(name).slice(0, 255);
      const latNum = parseFloat(latitude);
      const lngNum = parseFloat(longitude);
      const cleanNum = Math.min(5, Math.max(1, parseInt(cleanRating, 10) || 3));
      const facilitiesNum = Math.min(5, Math.max(1, parseInt(facilitiesRating, 10) || 3));
      const privacyNum = Math.min(5, Math.max(1, parseInt(privacyRating, 10) || 3));

      const notesArr = Array.isArray(notes) ? notes : notes ? [String(notes)] : [];
      const notesJson = JSON.stringify(notesArr);

      const { rows } = await sql`
        INSERT INTO places (id, name, latitude, longitude, clean_rating, facilities_rating, privacy_rating, notes)
        VALUES (${placeId}, ${safeName}, ${latNum}, ${lngNum}, ${cleanNum}, ${facilitiesNum}, ${privacyNum}, ${notesJson}::jsonb)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          clean_rating = EXCLUDED.clean_rating,
          facilities_rating = EXCLUDED.facilities_rating,
          privacy_rating = EXCLUDED.privacy_rating,
          notes = EXCLUDED.notes
        RETURNING id, name, latitude, longitude, clean_rating, facilities_rating, privacy_rating, notes;
      `;

      const inserted = rows[0];
      return res.status(201).json({
        id: inserted.id,
        name: inserted.name,
        latitude: Number(inserted.latitude),
        longitude: Number(inserted.longitude),
        cleanRating: Number(inserted.clean_rating),
        facilitiesRating: Number(inserted.facilities_rating),
        privacyRating: Number(inserted.privacy_rating),
        notes: notesArr,
      });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error: any) {
    console.error("Error in /api/places:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
