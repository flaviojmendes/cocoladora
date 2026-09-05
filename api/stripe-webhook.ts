import { randomUUID } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "@vercel/postgres";
import Stripe from "stripe";

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

const BLANK_PIXELS = "0".repeat(64);

function asNumberArray(value: unknown): number[] {
  if (Array.isArray(value)) return value.map(Number);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(Number) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function asPixelArray(value: unknown, count: number): string[] {
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = [];
    }
  }
  const list = Array.isArray(parsed) ? parsed.map((item) => String(item).toLowerCase()) : [];
  return Array.from({ length: count }, (_, index) => {
    const pixels = list[index] || "";
    return pixels.length === 64 && /^[0-9a-f]+$/.test(pixels) ? pixels : BLANK_PIXELS;
  });
}

async function completeOrder(orderId: string) {
  const client = await sql.connect();
  try {
    await client.query("BEGIN");
    const orderResult = await client.query(
      `SELECT order_id, owner_hash, tile_indices, tile_prices, tile_pixels, href, poster, status
       FROM pixel_orders
       WHERE order_id = $1
       FOR UPDATE`,
      [orderId]
    );
    const order = orderResult.rows[0];
    if (!order || order.status === "completed") {
      await client.query("COMMIT");
      return;
    }

    const indices = asNumberArray(order.tile_indices);
    const prices = asNumberArray(order.tile_prices);
    const artwork = asPixelArray(order.tile_pixels, indices.length);
    if (!indices.length || indices.length !== prices.length) {
      throw new Error("Invalid pixel order data");
    }

    const tiles = await client.query(
      `SELECT tile_index, reserved_by
       FROM door_pixel_tiles
       WHERE tile_index = ANY($1::smallint[])
       FOR UPDATE`,
      [indices]
    );
    if (
      tiles.rows.length !== indices.length ||
      tiles.rows.some((row: any) => row.reserved_by !== orderId)
    ) {
      throw new Error("Pixel reservation no longer belongs to this order");
    }

    const href =
      typeof order.href === "string" && /^https?:\/\//i.test(order.href) ? order.href.slice(0, 500) : "";
    const poster =
      typeof order.poster === "string" && order.poster.startsWith("data:image/") && order.poster.length <= 220000
        ? order.poster
        : "";
    let posterId: string | null = null;
    if (poster) {
      posterId = randomUUID();
      await client.query(`INSERT INTO door_pixel_posters (poster_id, image) VALUES ($1, $2)`, [
        posterId,
        poster,
      ]);
    }

    await client.query(
      `UPDATE door_pixel_tiles AS tile
       SET price_cents = purchase.price_cents,
           owner_hash = $4,
           pixels = purchase.pixels,
           href = $5,
           poster_id = $6,
           reserved_by = NULL,
           reserved_until = NULL,
           updated_at = CURRENT_TIMESTAMP
       FROM unnest($1::smallint[], $2::integer[], $3::text[]) AS purchase(tile_index, price_cents, pixels)
       WHERE tile.tile_index = purchase.tile_index`,
      [indices, prices, artwork, order.owner_hash, href, posterId]
    );
    await client.query(
      `UPDATE pixel_orders
       SET status = 'completed', completed_at = CURRENT_TIMESTAMP
       WHERE order_id = $1`,
      [orderId]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function cancelOrder(orderId: string) {
  const client = await sql.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE pixel_orders
       SET status = 'cancelled'
       WHERE order_id = $1 AND status = 'pending'`,
      [orderId]
    );
    await client.query(
      `UPDATE door_pixel_tiles
       SET reserved_by = NULL, reserved_until = NULL
       WHERE reserved_by = $1`,
      [orderId]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeSecret || !webhookSecret) {
    return res.status(503).json({ error: "Stripe webhook is not configured." });
  }

  try {
    const rawBody = await readRawBody(req);
    const signatureHeader = req.headers["stripe-signature"];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    if (!signature) return res.status(400).json({ error: "Missing Stripe signature." });

    const stripe = new Stripe(stripeSecret);
    await sql`ALTER TABLE pixel_orders ADD COLUMN IF NOT EXISTS tile_pixels JSONB`;
    await sql`ALTER TABLE pixel_orders ADD COLUMN IF NOT EXISTS href VARCHAR(500) DEFAULT ''`;
    await sql`ALTER TABLE door_pixel_tiles ADD COLUMN IF NOT EXISTS href VARCHAR(500) DEFAULT ''`;
    await sql`
      CREATE TABLE IF NOT EXISTS door_pixel_posters (
        poster_id VARCHAR(64) PRIMARY KEY,
        image TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await sql`ALTER TABLE door_pixel_tiles ADD COLUMN IF NOT EXISTS poster_id VARCHAR(64)`;
    await sql`ALTER TABLE pixel_orders ADD COLUMN IF NOT EXISTS poster TEXT`;
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;

    if (orderId) {
      if (
        event.type === "checkout.session.completed" ||
        event.type === "checkout.session.async_payment_succeeded"
      ) {
        if (session.payment_status === "paid" || event.type === "checkout.session.async_payment_succeeded") {
          await completeOrder(orderId);
        }
      } else if (
        event.type === "checkout.session.expired" ||
        event.type === "checkout.session.async_payment_failed"
      ) {
        await cancelOrder(orderId);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("Error in /api/stripe-webhook:", error);
    return res.status(400).json({ error: error.message || "Invalid webhook" });
  }
}

