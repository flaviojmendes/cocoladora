import type { VercelRequest, VercelResponse } from "@vercel/node";
import { timingSafeEqual } from "crypto";
import { sql } from "@vercel/postgres";

function readProvidedSecret(req: VercelRequest): string {
  const header = req.headers["x-admin-secret"];
  if (typeof header === "string" && header) return header;
  const auth = req.headers.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }
  const bodySecret = req.body && typeof req.body.secret === "string" ? req.body.secret : "";
  return bodySecret;
}

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

function authorize(req: VercelRequest): "ok" | "unset" | "invalid" {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) return "unset";
  const provided = readProvidedSecret(req);
  if (!provided || !secretsMatch(provided, expected)) return "invalid";
  return "ok";
}

function parseNotes(notes: unknown): string[] {
  if (Array.isArray(notes)) return notes.map((n) => String(n));
  if (typeof notes === "string") {
    try {
      const parsed = JSON.parse(notes);
      return Array.isArray(parsed) ? parsed.map((n) => String(n)) : [notes];
    } catch {
      return notes
        .split("\n")
        .map((n) => n.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  try {
    const auth = authorize(req);
    if (auth === "unset") {
      return res.status(503).json({ error: "ADMIN_SECRET is not configured on the server." });
    }
    if (auth === "invalid") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (req.method === "POST" && req.body?.action === "login") {
      return res.status(200).json({ ok: true });
    }

    if (req.method === "GET") {
      const [locationsResult, placesResult, messagesResult] = await Promise.all([
        sql`
          SELECT id, latitude, longitude, city, totalearned, timestarted, timeended, day, created_at
          FROM locations
          ORDER BY created_at DESC;
        `,
        sql`
          SELECT id, name, latitude, longitude, clean_rating, facilities_rating, privacy_rating, notes, created_at
          FROM places
          ORDER BY created_at DESC;
        `,
        sql`
          SELECT id, message, font_color, font, rotation, created_at
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
        createdAt: row.created_at,
      }));

      const places = placesResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        cleanRating: Number(row.clean_rating) || 0,
        facilitiesRating: Number(row.facilities_rating) || 0,
        privacyRating: Number(row.privacy_rating) || 0,
        notes: parseNotes(row.notes),
        createdAt: row.created_at,
      }));

      const messages = messagesResult.rows.map((row) => ({
        id: row.id,
        message: row.message,
        fontColor: row.font_color || "#1e1b18",
        font: row.font || "Sedgwick Ave",
        rotation: Number(row.rotation) || 0,
        createdAt: row.created_at,
      }));

      return res.status(200).json({
        locations,
        places,
        messages,
        counts: {
          locations: locations.length,
          places: places.length,
          messages: messages.length,
        },
      });
    }

    if (req.method === "PATCH") {
      const { resource, id } = req.body || {};
      if (!resource || id === undefined || id === null || id === "") {
        return res.status(400).json({ error: "Missing resource or id" });
      }

      if (resource === "locations") {
        const idNum = parseInt(String(id), 10);
        if (isNaN(idNum)) return res.status(400).json({ error: "Invalid location id" });

        const latNum = parseFloat(req.body.latitude);
        const lngNum = parseFloat(req.body.longitude);
        const safeCity = typeof req.body.city === "string" ? req.body.city.slice(0, 255) : "";
        const safeTotalEarned = String(req.body.totalearned ?? "").slice(0, 64);
        const safeTimeStarted = typeof req.body.timestarted === "string" ? req.body.timestarted.slice(0, 32) : "";
        const safeTimeEnded = typeof req.body.timeended === "string" ? req.body.timeended.slice(0, 32) : "";
        const safeDay = typeof req.body.day === "string" ? req.body.day.slice(0, 32) : "";

        if (Number.isNaN(latNum) || Number.isNaN(lngNum) || !safeTotalEarned) {
          return res.status(400).json({ error: "Invalid location fields" });
        }

        const { rows } = await sql`
          UPDATE locations
          SET latitude = ${latNum},
              longitude = ${lngNum},
              city = ${safeCity},
              totalearned = ${safeTotalEarned},
              timestarted = ${safeTimeStarted},
              timeended = ${safeTimeEnded},
              day = ${safeDay}
          WHERE id = ${idNum}
          RETURNING id, latitude, longitude, city, totalearned, timestarted, timeended, day, created_at;
        `;
        if (!rows[0]) return res.status(404).json({ error: "Location not found" });
        const row = rows[0];
        return res.status(200).json({
          id: row.id,
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          city: row.city || "",
          totalearned: row.totalearned,
          timestarted: row.timestarted || "",
          timeended: row.timeended || "",
          day: row.day || "",
          createdAt: row.created_at,
        });
      }

      if (resource === "places") {
        const placeId = String(id).slice(0, 64);
        const safeName = String(req.body.name || "").slice(0, 255);
        const latNum = parseFloat(req.body.latitude);
        const lngNum = parseFloat(req.body.longitude);
        const cleanNum = Math.min(5, Math.max(0, parseInt(req.body.cleanRating, 10) || 0));
        const facilitiesNum = Math.min(5, Math.max(0, parseInt(req.body.facilitiesRating, 10) || 0));
        const privacyNum = Math.min(5, Math.max(0, parseInt(req.body.privacyRating, 10) || 0));
        const notesArr = parseNotes(req.body.notes);
        const notesJson = JSON.stringify(notesArr);

        if (!safeName || Number.isNaN(latNum) || Number.isNaN(lngNum)) {
          return res.status(400).json({ error: "Invalid place fields" });
        }

        const { rows } = await sql`
          UPDATE places
          SET name = ${safeName},
              latitude = ${latNum},
              longitude = ${lngNum},
              clean_rating = ${cleanNum},
              facilities_rating = ${facilitiesNum},
              privacy_rating = ${privacyNum},
              notes = ${notesJson}::jsonb
          WHERE id = ${placeId}
          RETURNING id, name, latitude, longitude, clean_rating, facilities_rating, privacy_rating, notes, created_at;
        `;
        if (!rows[0]) return res.status(404).json({ error: "Place not found" });
        const row = rows[0];
        return res.status(200).json({
          id: row.id,
          name: row.name,
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          cleanRating: Number(row.clean_rating) || 0,
          facilitiesRating: Number(row.facilities_rating) || 0,
          privacyRating: Number(row.privacy_rating) || 0,
          notes: parseNotes(row.notes),
          createdAt: row.created_at,
        });
      }

      if (resource === "messages") {
        const msgId = String(id).slice(0, 64);
        const safeMessage = String(req.body.message || "").trim().slice(0, 300);
        const safeColor = typeof req.body.fontColor === "string" ? req.body.fontColor.slice(0, 32) : "#1e1b18";
        const safeFont = typeof req.body.font === "string" ? req.body.font.slice(0, 64) : "Sedgwick Ave";
        const rotVal = Number(req.body.rotation) || 0;

        if (!safeMessage) {
          return res.status(400).json({ error: "Message cannot be empty" });
        }

        const { rows } = await sql`
          UPDATE door_messages
          SET message = ${safeMessage},
              font_color = ${safeColor},
              font = ${safeFont},
              rotation = ${rotVal}
          WHERE id = ${msgId}
          RETURNING id, message, font_color, font, rotation, created_at;
        `;
        if (!rows[0]) return res.status(404).json({ error: "Message not found" });
        const row = rows[0];
        return res.status(200).json({
          id: row.id,
          message: row.message,
          fontColor: row.font_color,
          font: row.font,
          rotation: Number(row.rotation) || 0,
          createdAt: row.created_at,
        });
      }

      return res.status(400).json({ error: "Unknown resource" });
    }

    if (req.method === "DELETE") {
      const resource = String(req.query.resource || req.body?.resource || "");
      const rawIds: string[] = [];
      if (req.query.id) rawIds.push(String(req.query.id));
      if (req.query.ids) {
        rawIds.push(...String(req.query.ids).split(","));
      }
      if (Array.isArray(req.body?.ids)) {
        rawIds.push(...req.body.ids.map((v: unknown) => String(v)));
      }

      const ids = [...new Set(rawIds.map((v) => v.trim()).filter(Boolean))];
      if (!resource || ids.length === 0) {
        return res.status(400).json({ error: "Missing resource or id(s)" });
      }

      if (resource === "locations") {
        const nums = ids.map((v) => parseInt(v, 10)).filter((n) => !isNaN(n));
        if (nums.length === 0) return res.status(400).json({ error: "Invalid location ids" });
        for (const idNum of nums) {
          await sql`DELETE FROM locations WHERE id = ${idNum};`;
        }
        return res.status(200).json({ success: true, deleted: nums.length });
      }

      if (resource === "places") {
        for (const placeId of ids) {
          await sql`DELETE FROM places WHERE id = ${placeId};`;
        }
        return res.status(200).json({ success: true, deleted: ids.length });
      }

      if (resource === "messages") {
        for (const msgId of ids) {
          await sql`DELETE FROM door_messages WHERE id = ${msgId};`;
        }
        return res.status(200).json({ success: true, deleted: ids.length });
      }

      return res.status(400).json({ error: "Unknown resource" });
    }

    res.setHeader("Allow", ["GET", "POST", "PATCH", "DELETE"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error: any) {
    console.error("Error in /api/admin:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
