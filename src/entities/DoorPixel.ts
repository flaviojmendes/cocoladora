export type DoorPixelTile = {
  index: number;
  priceCents: number;
  pixels: string;
  owned: boolean;
  mine: boolean;
  reserved: boolean;
  href?: string;
  posterId?: string;
  image?: string;
};

export type PixelSelection = {
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
};

