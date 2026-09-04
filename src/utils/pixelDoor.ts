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
  }));
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

