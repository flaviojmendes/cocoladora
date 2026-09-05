import { DoorPixelTile, PixelSelection } from "../entities/DoorPixel";

export const PIXEL_WIDTH = 128;
export const PIXEL_HEIGHT = 192;
export const TILE_SIZE = 8;
export const TILE_COLUMNS = PIXEL_WIDTH / TILE_SIZE;
export const TILE_ROWS = PIXEL_HEIGHT / TILE_SIZE;
export const TILE_COUNT = TILE_COLUMNS * TILE_ROWS;
export const PIXELS_PER_TILE = TILE_SIZE * TILE_SIZE;
export const START_PRICE_CENTS = 500;
export const BID_STEP_CENTS = 100;
export const PIXEL_OWNER_TOKEN_KEY = "cocoladora_pixel_owner";
export const PIXEL_DRAFT_KEY = "cocoladora_pixel_draft";
export const MAX_PIXEL_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PIXEL_HREF_LENGTH = 500;
export const MAX_POSTER_CHARS = 220_000;

export type PixelDraft = {
  tileIndices: number[];
  tiles: Array<{ index: number; pixels: string }>;
  bidInput: string;
  href?: string;
  poster?: string;
};

export const PIXEL_PALETTE = [
  "transparent",
  "#1a1410",
  "#7c2d12",
  "#9b1c1c",
  "#c2410c",
  "#ca8a04",
  "#14532d",
  "#0f766e",
  "#1e3a8a",
  "#6b21a8",
  "#831843",
  "#44403c",
  "#d6d3d1",
  "#f3efe3",
  "#fef3c7",
  "#111827",
] as const;

export function blankTilePixels(): string {
  return "0".repeat(PIXELS_PER_TILE);
}

export function normalizeTilePixels(value?: string): string {
  if (!value || value.length !== PIXELS_PER_TILE || !/^[0-9a-f]+$/i.test(value)) {
    return blankTilePixels();
  }
  return value.toLowerCase();
}

export function emptyPixelTiles(): DoorPixelTile[] {
  return Array.from({ length: TILE_COUNT }, (_, index) => ({
    index,
    priceCents: START_PRICE_CENTS,
    pixels: blankTilePixels(),
    owned: false,
    mine: false,
    reserved: false,
    href: "",
    posterId: "",
    image: "",
  }));
}

export function normalizeDoorHref(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().slice(0, MAX_PIXEL_HREF_LENGTH);
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local") ||
      host.endsWith(".internal")
    ) {
      return "";
    }
    url.username = "";
    url.password = "";
    return url.toString().slice(0, MAX_PIXEL_HREF_LENGTH);
  } catch {
    return "";
  }
}

export function doorHrefHost(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

export function posterSizeForSelection(tileCols: number, tileRows: number) {
  return {
    width: Math.min(640, Math.max(48, tileCols * 40)),
    height: Math.min(960, Math.max(48, tileRows * 40)),
  };
}

export function encodePosterFromImage(image: CanvasImageSource, width: number, height: number): string {
  let nextWidth = width;
  let nextHeight = height;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, 0, 0, nextWidth, nextHeight);
    for (let quality = 0.86; quality >= 0.45; quality -= 0.08) {
      const data = canvas.toDataURL("image/jpeg", quality);
      if (data.length <= MAX_POSTER_CHARS) return data;
    }
    nextWidth = Math.max(48, Math.round(nextWidth * 0.75));
    nextHeight = Math.max(48, Math.round(nextHeight * 0.75));
  }
  return "";
}

export function posterRegions(tiles: DoorPixelTile[]) {
  const groups = new Map<string, DoorPixelTile[]>();
  for (const tile of tiles) {
    if (!tile.posterId || !tile.image) continue;
    const list = groups.get(tile.posterId) || [];
    list.push(tile);
    groups.set(tile.posterId, list);
  }
  return [...groups.entries()].map(([id, group]) => {
    const cols = group.map((tile) => tile.index % TILE_COLUMNS);
    const rows = group.map((tile) => Math.floor(tile.index / TILE_COLUMNS));
    const startCol = Math.min(...cols);
    const endCol = Math.max(...cols);
    const startRow = Math.min(...rows);
    const endRow = Math.max(...rows);
    return {
      id,
      image: group[0].image || "",
      left: (startCol / TILE_COLUMNS) * 100,
      top: (startRow / TILE_ROWS) * 100,
      width: ((endCol - startCol + 1) / TILE_COLUMNS) * 100,
      height: ((endRow - startRow + 1) / TILE_ROWS) * 100,
    };
  });
}

export function getPixelOwnerToken(): string {
  try {
    const existing = localStorage.getItem(PIXEL_OWNER_TOKEN_KEY);
    if (existing) return existing;
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(PIXEL_OWNER_TOKEN_KEY, token);
    return token;
  } catch {
    return `pixel-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function normalizeSelection(selection: PixelSelection): PixelSelection {
  return {
    startCol: Math.min(selection.startCol, selection.endCol),
    startRow: Math.min(selection.startRow, selection.endRow),
    endCol: Math.max(selection.startCol, selection.endCol),
    endRow: Math.max(selection.startRow, selection.endRow),
  };
}

export function selectionTileIndices(selection: PixelSelection): number[] {
  const normalized = normalizeSelection(selection);
  const indices: number[] = [];
  for (let row = normalized.startRow; row <= normalized.endRow; row += 1) {
    for (let col = normalized.startCol; col <= normalized.endCol; col += 1) {
      if (row >= 0 && row < TILE_ROWS && col >= 0 && col < TILE_COLUMNS) {
        indices.push(row * TILE_COLUMNS + col);
      }
    }
  }
  return indices;
}

export function tileMinimumBid(tile: DoorPixelTile): number {
  return tile.owned ? tile.priceCents + BID_STEP_CENTS : START_PRICE_CENTS;
}

export function selectionMinimumBid(tiles: DoorPixelTile[], indices: number[]): number {
  return indices.reduce((sum, index) => sum + tileMinimumBid(tiles[index]), 0);
}

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function mergeTilePixels(
  tiles: DoorPixelTile[],
  updates: Array<{ index: number; pixels: string }>
): DoorPixelTile[] {
  if (!updates.length) return tiles;
  const byIndex = new Map(updates.map((item) => [item.index, normalizeTilePixels(item.pixels)]));
  return tiles.map((tile) => {
    const pixels = byIndex.get(tile.index);
    return pixels ? { ...tile, pixels } : tile;
  });
}

export function readPixelDraft(): PixelDraft | null {
  try {
    const raw = sessionStorage.getItem(PIXEL_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PixelDraft;
    if (!Array.isArray(parsed.tileIndices) || !Array.isArray(parsed.tiles)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePixelDraft(draft: PixelDraft) {
  try {
    sessionStorage.setItem(PIXEL_DRAFT_KEY, JSON.stringify(draft));
  } catch {}
}

export function clearPixelDraft() {
  try {
    sessionStorage.removeItem(PIXEL_DRAFT_KEY);
  } catch {}
}

export function composeDoorPixels(tiles: DoorPixelTile[]): string[] {
  const pixels = new Array(PIXEL_WIDTH * PIXEL_HEIGHT).fill("0");
  for (const tile of tiles) {
    const tilePixels = normalizeTilePixels(tile.pixels);
    const tileCol = tile.index % TILE_COLUMNS;
    const tileRow = Math.floor(tile.index / TILE_COLUMNS);
    for (let y = 0; y < TILE_SIZE; y += 1) {
      for (let x = 0; x < TILE_SIZE; x += 1) {
        const canvasX = tileCol * TILE_SIZE + x;
        const canvasY = tileRow * TILE_SIZE + y;
        pixels[canvasY * PIXEL_WIDTH + canvasX] = tilePixels[y * TILE_SIZE + x];
      }
    }
  }
  return pixels;
}

