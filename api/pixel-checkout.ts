import { createHash, randomUUID } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "@vercel/postgres";
import Stripe from "stripe";

const TILE_COLUMNS = 16;
const TILE_COUNT = 384;
const START_PRICE_CENTS = 500;
const BID_STEP_CENTS = 100;
const RESERVATION_SECONDS = 31 * 60;
const MAX_TOTAL_CENTS = 100_000_000;

let initialized = false;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function getOrigin(req: VercelRequest): string {
  const protoHeader = req.headers["x-forwarded-proto"];
  const proto = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader || "https";
  const hostHeader = req.headers["x-forwarded-host"] || req.headers.host;
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  return `${proto}://${host || "cocoladora.com"}`;
}

function isRectangle(indices: number[]): boolean {
  if (indices.length === 0) return false;
  const cols = indices.map((index) => index % TILE_COLUMNS);
  const rows = indices.map((index) => Math.floor(index / TILE_COLUMNS));
  const minCol = Math.min(...cols);
  const maxCol = Math.max(...cols);
  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);
  if ((maxCol - minCol + 1) * (maxRow - minRow + 1) !== indices.length) return false;
  const set = new Set(indices);
  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      if (!set.has(row * TILE_COLUMNS + col)) return false;
    }
  }
  return true;
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
    SELECT gs FROM generate_series(0, 383) AS gs
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
  initialized = true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  try {
    await ensurePixelTables();

    if (req.method === "GET") {
      const sessionId = typeof req.query.session_id === "string" ? req.query.session_id : "";
      if (!sessionId) return res.status(400).json({ error: "Sessão ausente." });
      const { rows } = await sql`
        SELECT status, tile_indices, total_cents
        FROM pixel_orders
        WHERE stripe_session_id = ${sessionId};
      `;
      if (!rows[0]) return res.status(404).json({ error: "Compra não encontrada." });
      return res.status(200).json({
        status: rows[0].status,
        tileIndices: rows[0].tile_indices,
        totalCents: Number(rows[0].total_cents),
      });
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", ["GET", "POST"]);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) {
      return res.status(503).json({ error: "Pagamento Stripe ainda não está configurado." });
    }

    const ownerToken = typeof req.body?.ownerToken === "string" ? req.body.ownerToken : "";
    if (ownerToken.length < 16 || ownerToken.length > 128) {
      return res.status(400).json({ error: "Identificação de comprador inválida." });
    }
    const ownerHash = hashToken(ownerToken);

    const rawIndices: unknown[] = Array.isArray(req.body?.tileIndices) ? req.body.tileIndices : [];
    const parsedIndices: number[] = rawIndices.map((value) => parseInt(String(value), 10));
    const tileIndices: number[] = [...new Set<number>(parsedIndices)].sort((a, b) => a - b);
    if (
      tileIndices.length === 0 ||
      tileIndices.length > TILE_COUNT ||
      tileIndices.some((index) => Number.isNaN(index) || index < 0 || index >= TILE_COUNT) ||
      !isRectangle(tileIndices)
    ) {
      return res.status(400).json({ error: "Selecione uma área retangular válida." });
    }

    const orderId = randomUUID();
    let totalCents = 0;
    let tilePrices: number[] = [];
    const requestedTotal = Math.round(Number(req.body?.bidTotalCents));
    const client = await sql.connect();

    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE door_pixel_tiles
         SET reserved_by = NULL, reserved_until = NULL
         WHERE reserved_until < CURRENT_TIMESTAMP`
      );
      const locked = await client.query(
        `SELECT tile_index, price_cents, owner_hash, reserved_by, reserved_until
         FROM door_pixel_tiles
         WHERE tile_index = ANY($1::smallint[])
         ORDER BY tile_index ASC
         FOR UPDATE`,
        [tileIndices]
      );

      if (locked.rows.length !== tileIndices.length) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "Alguns pixels não estão disponíveis." });
      }
      if (
        locked.rows.some(
          (row: any) =>
            row.reserved_by && row.reserved_until && new Date(row.reserved_until).getTime() > Date.now()
        )
      ) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "Alguém está comprando parte desta área. Tente outra." });
      }
      if (locked.rows.some((row: any) => row.owner_hash === ownerHash)) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: "A seleção inclui pixels que já são seus. Edite-os ou selecione apenas pixels de outros donos.",
        });
      }

      const minimumPrices = locked.rows.map((row: any) =>
        row.owner_hash ? Number(row.price_cents) + BID_STEP_CENTS : START_PRICE_CENTS
      );
      const minimumTotal = minimumPrices.reduce((sum: number, price: number) => sum + price, 0);
      totalCents = Number.isFinite(requestedTotal) ? requestedTotal : minimumTotal;

      if (totalCents < minimumTotal) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: `O lance mínimo para a área é R$ ${(minimumTotal / 100).toFixed(2)}.`,
          minimumTotalCents: minimumTotal,
        });
      }
      if (totalCents > MAX_TOTAL_CENTS) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Lance acima do limite permitido." });
      }

      const extra = totalCents - minimumTotal;
      const eachExtra = Math.floor(extra / tileIndices.length);
      let remainder = extra % tileIndices.length;
      tilePrices = minimumPrices.map((price: number) => {
        const next = price + eachExtra + (remainder > 0 ? 1 : 0);
        remainder = Math.max(0, remainder - 1);
        return next;
      });

      await client.query(
        `UPDATE door_pixel_tiles
         SET reserved_by = $1,
             reserved_until = CURRENT_TIMESTAMP + INTERVAL '2 hours'
         WHERE tile_index = ANY($2::smallint[])`,
        [orderId, tileIndices]
      );
      await client.query(
        `INSERT INTO pixel_orders
           (order_id, owner_hash, tile_indices, tile_prices, total_cents, status)
         VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, 'pending')`,
        [orderId, ownerHash, JSON.stringify(tileIndices), JSON.stringify(tilePrices), totalCents]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    const stripe = new Stripe(stripeSecret);
    try {
      const origin = getOrigin(req);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "brl",
              unit_amount: totalCents,
              product_data: {
                name: `${tileIndices.length} bloco${tileIndices.length === 1 ? "" : "s"} de pixels na Cocoladora`,
                description: "Cada bloco possui 8 × 8 pixels desenháveis na porta do banheiro.",
              },
            },
            quantity: 1,
          },
        ],
        metadata: { orderId },
        expires_at: Math.floor(Date.now() / 1000) + RESERVATION_SECONDS,
        success_url: `${origin}/?pixel_checkout=success&session_id={CHECKOUT_SESSION_ID}#writeMessage`,
        cancel_url: `${origin}/?pixel_checkout=cancelled#writeMessage`,
      });

      await sql`
        UPDATE pixel_orders
        SET stripe_session_id = ${session.id}
        WHERE order_id = ${orderId};
      `;
      return res.status(200).json({
        checkoutUrl: session.url,
        totalCents,
        tileCount: tileIndices.length,
      });
    } catch (error) {
      await sql`
        UPDATE pixel_orders SET status = 'failed' WHERE order_id = ${orderId};
      `;
      await sql`
        UPDATE door_pixel_tiles
        SET reserved_by = NULL, reserved_until = NULL
        WHERE reserved_by = ${orderId};
      `;
      throw error;
    }
  } catch (error: any) {
    console.error("Error in /api/pixel-checkout:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}

