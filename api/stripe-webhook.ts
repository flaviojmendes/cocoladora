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

async function completeOrder(orderId: string) {
  const client = await sql.connect();
  try {
    await client.query("BEGIN");
    const orderResult = await client.query(
      `SELECT order_id, owner_hash, tile_indices, tile_prices, status
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

    await client.query(
      `UPDATE door_pixel_tiles AS tile
       SET price_cents = purchase.price_cents,
           owner_hash = $3,
           pixels = '0000000000000000000000000000000000000000000000000000000000000000',
           reserved_by = NULL,
           reserved_until = NULL,
           updated_at = CURRENT_TIMESTAMP
       FROM unnest($1::smallint[], $2::integer[]) AS purchase(tile_index, price_cents)
       WHERE tile.tile_index = purchase.tile_index`,
      [indices, prices, order.owner_hash]
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

