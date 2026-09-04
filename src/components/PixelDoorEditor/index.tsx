import React, { useEffect, useMemo, useRef, useState } from "react";
import { DoorPixelTile, PixelSelection } from "../../entities/DoorPixel";
import { translate } from "../../languages/translator";
import {
  PIXEL_PALETTE,
  TILE_COLUMNS,
  TILE_SIZE,
  normalizeSelection,
  normalizeTilePixels,
  selectionTileIndices,
} from "../../utils/pixelDoor";

type Props = {
  tiles: DoorPixelTile[];
  selection: PixelSelection;
  saving: boolean;
  onCancel: () => void;
  onSave: (updates: Array<{ index: number; pixels: string }>) => void;
};

function buildArtwork(tiles: DoorPixelTile[], selection: PixelSelection) {
  const area = normalizeSelection(selection);
  const tileWidth = area.endCol - area.startCol + 1;
  const tileHeight = area.endRow - area.startRow + 1;
  const width = tileWidth * TILE_SIZE;
  const height = tileHeight * TILE_SIZE;
  const pixels = new Array(width * height).fill("0");

  for (const index of selectionTileIndices(area)) {
    const tile = tiles[index];
    if (!tile) continue;
    const tilePixels = normalizeTilePixels(tile.pixels);
    const localTileX = (index % TILE_COLUMNS) - area.startCol;
    const localTileY = Math.floor(index / TILE_COLUMNS) - area.startRow;
    for (let y = 0; y < TILE_SIZE; y += 1) {
      for (let x = 0; x < TILE_SIZE; x += 1) {
        const localX = localTileX * TILE_SIZE + x;
        const localY = localTileY * TILE_SIZE + y;
        pixels[localY * width + localX] = tilePixels[y * TILE_SIZE + x];
      }
    }
  }
  return { area, width, height, pixels };
}

export function PixelDoorEditor({ tiles, selection, saving, onCancel, onSave }: Props) {
  const initial = useMemo(() => buildArtwork(tiles, selection), [tiles, selection]);
  const [pixels, setPixels] = useState<string[]>(initial.pixels);
  const [colorIndex, setColorIndex] = useState(1);
  const [text, setText] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const editorScale = Math.min(416 / initial.width, 416 / initial.height);
  const editorWidth = Math.max(initial.width, Math.floor(initial.width * editorScale));
  const editorHeight = Math.max(initial.height, Math.floor(initial.height * editorScale));

  useEffect(() => {
    setPixels(initial.pixels);
  }, [initial]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, initial.width, initial.height);
    pixels.forEach((value, index) => {
      const color = PIXEL_PALETTE[parseInt(value, 16)];
      if (!color || color === "transparent") return;
      ctx.fillStyle = color;
      ctx.fillRect(index % initial.width, Math.floor(index / initial.width), 1, 1);
    });
  }, [pixels, initial.width, initial.height]);

  const paintAtEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(initial.width - 1, Math.floor(((event.clientX - rect.left) / rect.width) * initial.width))
    );
    const y = Math.max(
      0,
      Math.min(initial.height - 1, Math.floor(((event.clientY - rect.top) / rect.height) * initial.height))
    );
    const value = colorIndex.toString(16);
    setPixels((current) => {
      const at = y * initial.width + x;
      if (current[at] === value) return current;
      const next = [...current];
      next[at] = value;
      return next;
    });
  };

  const applyText = () => {
    if (!text.trim()) return;
    const source = document.createElement("canvas");
    source.width = initial.width;
    source.height = initial.height;
    const ctx = source.getContext("2d");
    if (!ctx) return;

    const lines = text.trim().split(/\n/).slice(0, 3);
    let size = Math.max(4, Math.min(24, Math.floor(initial.height / lines.length)));
    ctx.font = `700 ${size}px Cousine, monospace`;
    while (
      size > 4 &&
      lines.some((line) => ctx.measureText(line).width > Math.max(1, initial.width - 2))
    ) {
      size -= 1;
      ctx.font = `700 ${size}px Cousine, monospace`;
    }
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lineHeight = size * 1.05;
    const firstY = initial.height / 2 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, index) => ctx.fillText(line, initial.width / 2, firstY + index * lineHeight));

    const image = ctx.getImageData(0, 0, initial.width, initial.height);
    const value = colorIndex.toString(16);
    setPixels((current) =>
      current.map((pixel, index) => (image.data[index * 4 + 3] > 80 ? value : pixel))
    );
  };

  const save = () => {
    const updates = selectionTileIndices(initial.area).map((index) => {
      const tileX = (index % TILE_COLUMNS) - initial.area.startCol;
      const tileY = Math.floor(index / TILE_COLUMNS) - initial.area.startRow;
      let tilePixels = "";
      for (let y = 0; y < TILE_SIZE; y += 1) {
        for (let x = 0; x < TILE_SIZE; x += 1) {
          const localX = tileX * TILE_SIZE + x;
          const localY = tileY * TILE_SIZE + y;
          tilePixels += pixels[localY * initial.width + localX];
        }
      }
      return { index, pixels: tilePixels };
    });
    onSave(updates);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="font-secondary text-secondary-light">
        {translate("pixelEditorHint")} {initial.width} × {initial.height} px
      </p>

      <div className="pixel-editor-stage">
        <canvas
          ref={canvasRef}
          width={initial.width}
          height={initial.height}
          style={{ width: editorWidth, height: editorHeight }}
          onPointerDown={(event) => {
            drawingRef.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            paintAtEvent(event);
          }}
          onPointerMove={(event) => {
            if (drawingRef.current) paintAtEvent(event);
          }}
          onPointerUp={() => {
            drawingRef.current = false;
          }}
          onPointerCancel={() => {
            drawingRef.current = false;
          }}
          aria-label={translate("pixelEditorCanvas")}
        />
      </div>

      <div>
        <span className="block font-secondary text-primary-dark mb-2">{translate("pixelColors")}</span>
        <div className="flex flex-wrap gap-2">
          {PIXEL_PALETTE.map((color, index) => (
            <button
              key={`${color}-${index}`}
              type="button"
              onClick={() => setColorIndex(index)}
              className={`pixel-swatch ${colorIndex === index ? "pixel-swatch--active" : ""} ${
                color === "transparent" ? "pixel-swatch--eraser" : ""
              }`}
              style={color === "transparent" ? undefined : { backgroundColor: color }}
              title={index === 0 ? translate("pixelEraser") : color}
              aria-label={index === 0 ? translate("pixelEraser") : color}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block font-secondary text-primary-dark mb-1" htmlFor="pixel-text">
          {translate("pixelWriteText")}
        </label>
        <div className="flex gap-2">
          <input
            id="pixel-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={40}
            placeholder={translate("pixelTextPlaceholder")}
            className="min-w-0 flex-1 py-2 px-3 rounded-lg border-2 border-primary-dark font-typewriter text-secondary bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={applyText}
            disabled={!text.trim()}
            className="px-4 py-2 rounded-lg bg-secondary text-background font-secondary disabled:opacity-40"
          >
            {translate("pixelApplyText")}
          </button>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="w-1/3 py-3 rounded-xl font-secondary text-xl text-secondary bg-background-dark hover:bg-neutral-200"
        >
          {translate("cancel")}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-dark text-background font-secondary text-xl font-bold disabled:opacity-60"
        >
          {saving ? translate("adminSaving") : translate("pixelSaveArt")}
        </button>
      </div>
    </div>
  );
}

