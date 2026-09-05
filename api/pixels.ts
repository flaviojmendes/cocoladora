import { createHash, randomUUID, timingSafeEqual } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "@vercel/postgres";

const TILE_COUNT = 384;
const PIXELS_PER_TILE = 64;
const BLANK_PIXELS = "0".repeat(PIXELS_PER_TILE);
const MAX_POSTER_CHARS = 220_000;

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
  const header = req.headers["x-pixel-owner"];
  if (typeof header === "string") return header;
  return typeof req.body?.ownerToken === "string" ? req.body.ownerToken : "";
}

function publicTile(row: any, ownerHash = "") {
  return {
    index: Number(row.tile_index),
    priceCents: Number(row.price_cents),
    pixels: row.pixels || BLANK_PIXELS,
    owned: Boolean(row.owner_hash),
    mine: hashesMatch(ownerHash, row.owner_hash),
    reserved: Boolean(row.reserved_until && new Date(row.reserved_until).getTime() > Date.now()),
    href: sanitizeHref(row.href),
    posterId: row.poster_id || "",
  };
}

function sanitizePoster(value: unknown): string | { error: string } {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") return { error: "Imagem inválida." };
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length > MAX_POSTER_CHARS) {
    return { error: "Imagem grande demais. Escolha uma área menor ou outra foto." };
  }
  const match = trimmed.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) return { error: "Envie uma imagem JPEG, PNG ou WebP." };
  const kind = match[1].toLowerCase() === "jpg" ? "jpeg" : match[1].toLowerCase();
  return `data:image/${kind};base64,${match[2].replace(/\s/g, "")}`;
}

function sanitizeHref(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().slice(0, 500);
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return "";
    url.username = "";
    url.password = "";
    return url.toString().slice(0, 500);
  } catch {
    return "";
  }
}

async function ensurePixelTables() {
  if (initialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS door_pixel_tiles (
      tile_index SMALLINT PRIMARY KEY,
      price_cents INTEGER NOT NULL DEFAULT 500,
      owner_hash VARCHAR(64),
      pixels CHAR(64) NOT NULL DEFAULT '0000000000000000000000000000000000000000000000000000000000000000',
      reserved_by VARCHAR(64),
      reserved_until TIMESTAMP WITH TIME ZONE,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await sql`
    INSERT INTO door_pixel_tiles (tile_index)
    SELECT gs
    FROM generate_series(0, 383) AS gs
    ON CONFLICT (tile_index) DO NOTHING;
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS pixel_orders (
      order_id VARCHAR(64) PRIMARY KEY,
      stripe_session_id VARCHAR(255) UNIQUE,
      owner_hash VARCHAR(64) NOT NULL,
      tile_indices JSONB NOT NULL,
      tile_prices JSONB NOT NULL,
      total_cents INTEGER NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP WITH TIME ZONE
    );
  `;
  await sql`ALTER TABLE pixel_orders ADD COLUMN IF NOT EXISTS tile_pixels JSONB;`;
  await sql`ALTER TABLE door_pixel_tiles ADD COLUMN IF NOT EXISTS href VARCHAR(500) DEFAULT '';`;
  await sql`
    CREATE TABLE IF NOT EXISTS door_pixel_posters (
      poster_id VARCHAR(64) PRIMARY KEY,
      image TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await sql`ALTER TABLE door_pixel_tiles ADD COLUMN IF NOT EXISTS poster_id VARCHAR(64);`;
  initialized = true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  try {
    await ensurePixelTables();

    if (req.method === "GET") {
      const ownerToken = readOwnerToken(req);
      const ownerHash = ownerToken ? hashToken(ownerToken) : "";
      await sql`
        UPDATE door_pixel_tiles
        SET reserved_by = NULL, reserved_until = NULL
        WHERE reserved_until < CURRENT_TIMESTAMP;
      `;
      const { rows } = await sql`
        SELECT tile_index, price_cents, owner_hash, pixels, reserved_until, href, poster_id
        FROM door_pixel_tiles
        ORDER BY tile_index ASC;
      `;
      const posterIds = [
        ...new Set(rows.map((row) => row.poster_id).filter((id): id is string => Boolean(id))),
      ];
      const posters: { [id: string]: string } = {};
      if (posterIds.length) {
        const posterRows = await sql.query(
          `SELECT poster_id, image FROM door_pixel_posters WHERE poster_id = ANY($1::varchar[])`,
          [posterIds]
        );
        for (const row of posterRows.rows) {
          posters[row.poster_id] = row.image;
        }
      }
      return res.status(200).json({
        tiles: rows.map((row) => publicTile(row, ownerHash)),
        posters,
      });
    }

    if (req.method === "PATCH") {
      const ownerToken = readOwnerToken(req);
      if (ownerToken.length < 16 || ownerToken.length > 128) {
        return res.status(401).json({ error: "Identificação de proprietário inválida." });
      }

      const updates = Array.isArray(req.body?.tiles) ? req.body.tiles : [];
      if (updates.length === 0 || updates.length > TILE_COUNT) {
        return res.status(400).json({ error: "Envie ao menos um bloco para desenhar." });
      }

      const normalized = updates.map((item: any) => ({
        index: parseInt(String(item.index), 10),
        pixels: typeof item.pixels === "string" ? item.pixels.toLowerCase() : "",
      }));
      const indices = normalized.map((item: any) => item.index);
      if (
        new Set(indices).size !== indices.length ||
        normalized.some(
          (item: any) =>
            Number.isNaN(item.index) ||
            item.index < 0 ||
            item.index >= TILE_COUNT ||
            item.pixels.length !== PIXELS_PER_TILE ||
            !/^[0-9a-f]+$/.test(item.pixels)
        )
      ) {
        return res.status(400).json({ error: "Dados de pixel inválidos." });
      }

      const rawHref = typeof req.body?.href === "string" ? req.body.href.trim() : "";
      const href = sanitizeHref(rawHref);
      if (rawHref && !href) {
        return res.status(400).json({ error: "Link inválido. Use um endereço http ou https." });
      }

      const poster = sanitizePoster(req.body?.poster);
      if (typeof poster !== "string") {
        return res.status(400).json({ error: poster.error });
      }

      const ownerHash = hashToken(ownerToken);
      const client = await sql.connect();
      try {
        await client.query("BEGIN");
        const owned = await client.query(
          `SELECT tile_index, owner_hash
           FROM door_pixel_tiles
           WHERE tile_index = ANY($1::smallint[])
           FOR UPDATE`,
          [indices]
        );
        if (
          owned.rows.length !== indices.length ||
          owned.rows.some((row: any) => !hashesMatch(ownerHash, row.owner_hash))
        ) {
          await client.query("ROLLBACK");
          return res.status(403).json({ error: "Você não possui todos os pixels selecionados." });
        }

        let posterId: string | null = null;
        if (poster) {
          posterId = randomUUID();
          await client.query(
            `INSERT INTO door_pixel_posters (poster_id, image) VALUES ($1, $2)`,
            [posterId, poster]
          );
        }

        await client.query(
          `UPDATE door_pixel_tiles AS tile
           SET pixels = art.pixels,
               href = $3,
               poster_id = $4,
               updated_at = CURRENT_TIMESTAMP
           FROM unnest($1::smallint[], $2::text[]) AS art(tile_index, pixels)
           WHERE tile.tile_index = art.tile_index`,
          [indices, normalized.map((item: any) => item.pixels), href, posterId]
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", ["GET", "PATCH"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error: any) {
    console.error("Error in /api/pixels:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}

