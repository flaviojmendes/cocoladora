import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ensureTables, sql } from "./_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureTables();

    if (req.method === "GET") {
      const { rows } = await sql`
        SELECT id, message, font_color, font, rotation, created_at
        FROM door_messages
        ORDER BY created_at DESC;
      `;

      const messages = rows.map((row) => ({
        id: row.id,
        message: row.message,
        fontColor: row.font_color || "#1e1b18",
        font: row.font || "Sedgwick Ave",
        style: {
          transform: `rotate(${row.rotation || 0}deg)`,
        },
      }));

      return res.status(200).json(messages);
    }

    if (req.method === "POST") {
      const { id, message, fontColor, font, style, rotation } = req.body || {};

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Missing required field: message" });
      }

      const msgId = id || `door-${Date.now()}`;
      const safeMessage = message.trim().slice(0, 300);
      const safeColor = typeof fontColor === "string" ? fontColor.slice(0, 32) : "#1e1b18";
      const safeFont = typeof font === "string" ? font.slice(0, 64) : "Sedgwick Ave";

      let rotVal = 0;
      if (typeof rotation === "number") {
        rotVal = rotation;
      } else if (style && typeof style.transform === "string") {
        const match = style.transform.match(/rotate\(([-0-9.]+)deg\)/);
        if (match) {
          rotVal = parseFloat(match[1]) || 0;
        }
      }

      const { rows } = await sql`
        INSERT INTO door_messages (id, message, font_color, font, rotation)
        VALUES (${msgId}, ${safeMessage}, ${safeColor}, ${safeFont}, ${rotVal})
        RETURNING id, message, font_color, font, rotation, created_at;
      `;

      const inserted = rows[0];
      return res.status(201).json({
        id: inserted.id,
        message: inserted.message,
        fontColor: inserted.font_color,
        font: inserted.font,
        style: {
          transform: `rotate(${inserted.rotation || 0}deg)`,
        },
      });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error: any) {
    console.error("Error in /api/messages:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
