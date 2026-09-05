import React, { useEffect, useRef, useState } from "react";
import { FaImage, FaLink } from "react-icons/fa";
import { DoorPixelTile, PixelSelection } from "../../entities/DoorPixel";
import { translate } from "../../languages/translator";
import {
  MAX_PIXEL_IMAGE_BYTES,
  PIXEL_PALETTE,
  TILE_COLUMNS,
  TILE_SIZE,
  bakePosterLayout,
  fitImageInFrame,
  normalizeDoorHref,
  normalizeSelection,
  normalizeTilePixels,
  posterScaleLimits,
  posterSizeForSelection,
  selectionTileIndices,
  zoomPosterLayout,
} from "../../utils/pixelDoor";
import type { PosterLayout } from "../../utils/pixelDoor";

type Props = {
  tiles: DoorPixelTile[];
  selection: PixelSelection;
  saving: boolean;
  requiresPayment?: boolean;
  initialHref?: string;
  initialPoster?: string;
  hint?: string;
  onCancel: () => void;
  onDraftChange?: (updates: Array<{ index: number; pixels: string }>) => void;
  onPosterChange?: (poster: string) => void;
  onSave: (updates: Array<{ index: number; pixels: string }>, href: string, poster: string) => void;
};

type Corner = "tl" | "tr" | "bl" | "br";
type SourceImage = { url: string; width: number; height: number };

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

function resizePosterLayout(
  layout: PosterLayout,
  naturalWidth: number,
  naturalHeight: number,
  corner: Corner,
  pointerX: number,
  pointerY: number,
  minScale: number,
  maxScale: number
): PosterLayout {
  const width = naturalWidth * layout.scale;
  const height = naturalHeight * layout.scale;
  const right = layout.x + width;
  const bottom = layout.y + height;
  const fixedX = corner === "tl" || corner === "bl" ? right : layout.x;
  const fixedY = corner === "tl" || corner === "tr" ? bottom : layout.y;
  const signX = corner === "tl" || corner === "bl" ? -1 : 1;
  const signY = corner === "tl" || corner === "tr" ? -1 : 1;
  const scaleFromX = ((pointerX - fixedX) * signX) / naturalWidth;
  const scaleFromY = ((pointerY - fixedY) * signY) / naturalHeight;
  const nextScale = Math.min(maxScale, Math.max(minScale, Math.max(scaleFromX, scaleFromY)));
  return {
    scale: nextScale,
    x: corner === "tl" || corner === "bl" ? fixedX - naturalWidth * nextScale : fixedX,
    y: corner === "tl" || corner === "tr" ? fixedY - naturalHeight * nextScale : fixedY,
  };
}

export function PixelDoorEditor({
  tiles,
  selection,
  saving,
  requiresPayment = false,
  initialHref = "",
  initialPoster = "",
  hint,
  onCancel,
  onDraftChange,
  onPosterChange,
  onSave,
}: Props) {
  const [initial] = useState(() => buildArtwork(tiles, selection));
  const [pixels, setPixels] = useState<string[]>(initial.pixels);
  const [colorIndex, setColorIndex] = useState(1);
  const [text, setText] = useState("");
  const [href, setHref] = useState(initialHref);
  const [poster, setPoster] = useState(initialPoster);
  const [source, setSource] = useState<SourceImage | null>(null);
  const [layout, setLayout] = useState<PosterLayout>({ x: 0, y: 0, scale: 1 });
  const [adjusting, setAdjusting] = useState(Boolean(initialPoster));
  const [linkError, setLinkError] = useState("");
  const [imageError, setImageError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const blobUrlRef = useRef("");
  const drawingRef = useRef(false);
  const dragRef = useRef<{
    type: "pan" | "resize";
    pointerId: number;
    startX: number;
    startY: number;
    layout: PosterLayout;
    corner?: Corner;
  } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef(0);
  const bakeTimerRef = useRef<number>();
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const editorScale = Math.min(416 / initial.width, 416 / initial.height);
  const editorWidth = Math.max(initial.width, Math.floor(initial.width * editorScale));
  const editorHeight = Math.max(initial.height, Math.floor(initial.height * editorScale));
  const scaleLimits = source
    ? posterScaleLimits(source.width, source.height, editorWidth, editorHeight)
    : { min: 0.1, max: 8 };

  const outputSize = () => {
    const tileCols = initial.area.endCol - initial.area.startCol + 1;
    const tileRows = initial.area.endRow - initial.area.startRow + 1;
    return posterSizeForSelection(tileCols, tileRows);
  };

  const bakeCurrent = (nextSource = source, nextLayout = layout) => {
    const image = imageRef.current;
    if (!nextSource || !image) return "";
    const size = outputSize();
    return bakePosterLayout(
      image,
      nextSource.width,
      nextSource.height,
      editorWidth,
      editorHeight,
      nextLayout,
      size.width,
      size.height
    );
  };

  const publishPoster = (nextSource: SourceImage, nextLayout: PosterLayout, immediate = false) => {
    window.clearTimeout(bakeTimerRef.current);
    const run = () => {
      const encoded = bakeCurrent(nextSource, nextLayout);
      if (!encoded) {
        setImageError(translate("pixelImageTooBig"));
        return;
      }
      setPoster(encoded);
      onPosterChange?.(encoded);
    };
    if (immediate) run();
    else bakeTimerRef.current = window.setTimeout(run, 80);
  };

  const revokeBlob = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = "";
    }
  };

  useEffect(() => {
    return () => {
      window.clearTimeout(bakeTimerRef.current);
      revokeBlob();
    };
  }, []);

  useEffect(() => {
    if (!initialPoster) return;
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled || blobUrlRef.current) return;
      imageRef.current = image;
      const fitted = fitImageInFrame(
        image.naturalWidth,
        image.naturalHeight,
        editorWidth,
        editorHeight,
        "cover"
      );
      setSource({ url: initialPoster, width: image.naturalWidth, height: image.naturalHeight });
      setLayout(fitted);
    };
    image.src = initialPoster;
    return () => {
      cancelled = true;
    };
  }, [editorHeight, editorWidth, initialPoster]);

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

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const onWheel = (event: WheelEvent) => {
      const currentSource = source;
      if (!currentSource || !adjusting) return;
      event.preventDefault();
      const rect = frame.getBoundingClientRect();
      const next = zoomPosterLayout(
        layoutRef.current,
        event.deltaY > 0 ? 0.92 : 1.08,
        event.clientX - rect.left,
        event.clientY - rect.top,
        scaleLimits.min,
        scaleLimits.max
      );
      setLayout(next);
      publishPoster(currentSource, next);
    };
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, [adjusting, scaleLimits.max, scaleLimits.min, source]);

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
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = initial.width;
    sourceCanvas.height = initial.height;
    const ctx = sourceCanvas.getContext("2d");
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

  const applyImageFile = (file: File | undefined) => {
    setImageError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError(translate("pixelImageError"));
      return;
    }
    if (file.size > MAX_PIXEL_IMAGE_BYTES) {
      setImageError(translate("pixelImageTooBig"));
      return;
    }
    revokeBlob();
    const url = URL.createObjectURL(file);
    blobUrlRef.current = url;
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      const nextSource = { url, width: image.naturalWidth, height: image.naturalHeight };
      const nextLayout = fitImageInFrame(
        image.naturalWidth,
        image.naturalHeight,
        editorWidth,
        editorHeight,
        "contain"
      );
      setSource(nextSource);
      setLayout(nextLayout);
      setAdjusting(true);
      publishPoster(nextSource, nextLayout, true);
    };
    image.onerror = () => {
      revokeBlob();
      setImageError(translate("pixelImageError"));
    };
    image.src = url;
  };

  const framePoint = (event: React.PointerEvent) => {
    const frame = frameRef.current;
    if (!frame) return { x: 0, y: 0 };
    const rect = frame.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const startPan = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!source) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2) {
      const points = [...pointersRef.current.values()];
      pinchRef.current = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      dragRef.current = null;
      return;
    }
    const point = framePoint(event);
    dragRef.current = {
      type: "pan",
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      layout,
    };
  };

  const startResize = (corner: Corner, event: React.PointerEvent<HTMLButtonElement>) => {
    if (!source) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = framePoint(event);
    dragRef.current = {
      type: "resize",
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      layout,
      corner,
    };
  };

  const moveTransform = (event: React.PointerEvent) => {
    if (!source) return;
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (pointersRef.current.size === 2) {
      const points = [...pointersRef.current.values()];
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      if (pinchRef.current > 0 && distance > 0) {
        const frame = frameRef.current?.getBoundingClientRect();
        const cx = frame ? (points[0].x + points[1].x) / 2 - frame.left : editorWidth / 2;
        const cy = frame ? (points[0].y + points[1].y) / 2 - frame.top : editorHeight / 2;
        const next = zoomPosterLayout(
          layoutRef.current,
          distance / pinchRef.current,
          cx,
          cy,
          scaleLimits.min,
          scaleLimits.max
        );
        pinchRef.current = distance;
        setLayout(next);
        publishPoster(source, next);
      }
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = framePoint(event);
    if (drag.type === "pan") {
      const next = {
        ...drag.layout,
        x: drag.layout.x + (point.x - drag.startX),
        y: drag.layout.y + (point.y - drag.startY),
      };
      setLayout(next);
      publishPoster(source, next);
      return;
    }
    if (!drag.corner) return;
    const next = resizePosterLayout(
      drag.layout,
      source.width,
      source.height,
      drag.corner,
      point.x,
      point.y,
      scaleLimits.min,
      scaleLimits.max
    );
    setLayout(next);
    publishPoster(source, next);
  };

  const endTransform = (event: React.PointerEvent) => {
    pointersRef.current.delete(event.pointerId);
    pinchRef.current = 0;
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    if (source) publishPoster(source, layoutRef.current, true);
  };

  const packTiles = (pixelSource: string[]) =>
    selectionTileIndices(initial.area).map((index) => {
      const tileX = (index % TILE_COLUMNS) - initial.area.startCol;
      const tileY = Math.floor(index / TILE_COLUMNS) - initial.area.startRow;
      let tilePixels = "";
      for (let y = 0; y < TILE_SIZE; y += 1) {
        for (let x = 0; x < TILE_SIZE; x += 1) {
          const localX = tileX * TILE_SIZE + x;
          const localY = tileY * TILE_SIZE + y;
          tilePixels += pixelSource[localY * initial.width + localX];
        }
      }
      return { index, pixels: tilePixels };
    });

  useEffect(() => {
    onDraftChange?.(packTiles(pixels));
  }, [pixels]);

  const save = () => {
    const trimmed = href.trim();
    const normalized = normalizeDoorHref(trimmed);
    if (trimmed && !normalized) {
      setLinkError(translate("pixelLinkInvalid"));
      return;
    }
    setLinkError("");
    const baked = source ? bakeCurrent(source, layout) : poster;
    if (source && !baked) {
      setImageError(translate("pixelImageTooBig"));
      return;
    }
    onSave(packTiles(pixels), normalized, baked);
  };

  const posterBox = source
    ? {
        left: layout.x,
        top: layout.y,
        width: source.width * layout.scale,
        height: source.height * layout.scale,
      }
    : null;

  return (
    <div className="flex flex-col gap-4">
      <p className="font-secondary text-secondary-light">
        {hint || translate("pixelEditorHint")} {initial.width} × {initial.height} px
      </p>

      <div className={`pixel-editor-stage ${source ? "pixel-editor-stage--photo" : ""}`}>
        <div ref={frameRef} className="pixel-editor-frame" style={{ width: editorWidth, height: editorHeight }}>
          <div className="pixel-editor-clip">
            {source && posterBox && (
              <img
                src={source.url}
                alt=""
                className="pixel-editor-poster"
                style={{
                  left: posterBox.left,
                  top: posterBox.top,
                  width: posterBox.width,
                  height: posterBox.height,
                }}
                aria-hidden="true"
              />
            )}
            <canvas
              ref={canvasRef}
              width={initial.width}
              height={initial.height}
              style={{ pointerEvents: adjusting && source ? "none" : "auto" }}
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
            {source && adjusting && (
              <div
                className="pixel-editor-crop"
                onPointerDown={startPan}
                onPointerMove={moveTransform}
                onPointerUp={endTransform}
                onPointerCancel={endTransform}
              />
            )}
          </div>
          {source && adjusting && posterBox && (
            <>
              {(["tl", "tr", "bl", "br"] as Corner[]).map((corner) => (
                <button
                  key={corner}
                  type="button"
                  className={`pixel-editor-handle pixel-editor-handle--${corner}`}
                  style={{
                    left: corner === "tl" || corner === "bl" ? posterBox.left : posterBox.left + posterBox.width,
                    top: corner === "tl" || corner === "tr" ? posterBox.top : posterBox.top + posterBox.height,
                  }}
                  aria-label={translate("pixelImageZoom")}
                  onPointerDown={(event) => startResize(corner, event)}
                  onPointerMove={moveTransform}
                  onPointerUp={endTransform}
                  onPointerCancel={endTransform}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {source && (
        <>
          <div className="pixel-editor-tools">
            <button
              type="button"
              className={adjusting ? "pixel-editor-tools--on" : ""}
              onClick={() => setAdjusting(true)}
            >
              {translate("pixelAdjustImage")}
            </button>
            <button
              type="button"
              className={!adjusting ? "pixel-editor-tools--on" : ""}
              onClick={() => setAdjusting(false)}
            >
              {translate("pixelDrawPixels")}
            </button>
          </div>
          <label className="pixel-editor-zoom">
            {translate("pixelImageZoom")}
            <input
              type="range"
              min={scaleLimits.min}
              max={scaleLimits.max}
              step={(scaleLimits.max - scaleLimits.min) / 80}
              value={layout.scale}
              onChange={(event) => {
                const next = zoomPosterLayout(
                  layout,
                  Number(event.target.value) / layout.scale,
                  editorWidth / 2,
                  editorHeight / 2,
                  scaleLimits.min,
                  scaleLimits.max
                );
                setLayout(next);
                publishPoster(source, next);
              }}
              aria-label={translate("pixelImageZoom")}
            />
          </label>
        </>
      )}

      <div>
        <span className="block font-secondary text-primary-dark mb-2">{translate("pixelColors")}</span>
        <div className="flex flex-wrap gap-2">
          {PIXEL_PALETTE.map((color, index) => (
            <button
              key={`${color}-${index}`}
              type="button"
              onClick={() => {
                setColorIndex(index);
                if (source) setAdjusting(false);
              }}
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
        <label className="block font-secondary text-primary-dark mb-1" htmlFor="pixel-upload">
          {translate("pixelUploadImage")}
        </label>
        <input
          ref={fileRef}
          id="pixel-upload"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          onChange={(event) => {
            applyImageFile(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="pixel-editor-upload"
        >
          <FaImage />
          {translate("pixelUploadButton")}
        </button>
        <p className="pixel-editor-note">{translate("pixelUploadHint")}</p>
        {source && (
          <button
            type="button"
            onClick={() => {
              window.clearTimeout(bakeTimerRef.current);
              revokeBlob();
              imageRef.current = null;
              setSource(null);
              setPoster("");
              setAdjusting(false);
              onPosterChange?.("");
            }}
            className="pixel-editor-remove"
          >
            {translate("pixelRemoveImage")}
          </button>
        )}
        {imageError && <p className="pixel-editor-error">{imageError}</p>}
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

      <div>
        <label className="block font-secondary text-primary-dark mb-1" htmlFor="pixel-link">
          {translate("pixelLinkLabel")}
        </label>
        <div className="pixel-link-field">
          <FaLink />
          <input
            id="pixel-link"
            value={href}
            onChange={(event) => {
              setHref(event.target.value);
              setLinkError("");
            }}
            inputMode="url"
            autoComplete="url"
            placeholder={translate("pixelLinkPlaceholder")}
            maxLength={500}
          />
        </div>
        <p className="pixel-editor-note">{translate("pixelLinkHint")}</p>
        {linkError && <p className="pixel-editor-error">{linkError}</p>}
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
          {saving
            ? requiresPayment
              ? translate("pixelOpeningStripe")
              : translate("adminSaving")
            : requiresPayment
              ? translate("pixelSaveAndPay")
              : translate("pixelSaveArt")}
        </button>
      </div>
    </div>
  );
}
