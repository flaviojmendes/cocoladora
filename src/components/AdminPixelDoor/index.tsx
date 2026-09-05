import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaEdit, FaExternalLinkAlt, FaMousePointer } from "react-icons/fa";
import { DoorPixelTile, PixelSelection } from "../../entities/DoorPixel";
import { translate } from "../../languages/translator";
import { ApiService } from "../../services/api";
import {
  PIXEL_HEIGHT,
  PIXEL_PALETTE,
  PIXEL_WIDTH,
  TILE_COLUMNS,
  TILE_ROWS,
  TILE_SIZE,
  composeDoorPixels,
  doorHrefHost,
  emptyPixelTiles,
  mergeTilePixels,
  normalizeSelection,
  posterRegions,
  selectionTileIndices,
} from "../../utils/pixelDoor";
import { AudioService } from "../../utils/audio";
import { PixelDoorEditor } from "../PixelDoorEditor";

type Props = {
  secret: string;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
};

export function AdminPixelDoor({ secret, onNotice, onError }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef(false);
  const anchorRef = useRef<{ col: number; row: number } | null>(null);
  const [tiles, setTiles] = useState<DoorPixelTile[]>(emptyPixelTiles);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selection, setSelection] = useState<PixelSelection | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draftTiles, setDraftTiles] = useState<Array<{ index: number; pixels: string }>>([]);
  const [draftHref, setDraftHref] = useState("");
  const [draftPoster, setDraftPoster] = useState("");

  const loadTiles = useCallback(async () => {
    try {
      const data = await ApiService.getDoorPixelTiles("");
      setTiles(data);
      return data;
    } catch (err: any) {
      const message = err.message || translate("pixelLoadError");
      onError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    loadTiles();
  }, [loadTiles]);

  useEffect(() => {
    const stopDragging = () => {
      const wasDragging = draggingRef.current;
      draggingRef.current = false;
      if (wasDragging) setEditorOpen(true);
    };
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
    return () => {
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, []);

  const allPixels = useMemo(
    () => composeDoorPixels(mergeTilePixels(tiles, draftTiles)),
    [tiles, draftTiles]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, PIXEL_WIDTH, PIXEL_HEIGHT);
    allPixels.forEach((value, index) => {
      const color = PIXEL_PALETTE[parseInt(value, 16)];
      if (!color || color === "transparent") return;
      ctx.fillStyle = color;
      ctx.fillRect(index % PIXEL_WIDTH, Math.floor(index / PIXEL_WIDTH), 1, 1);
    });
  }, [allPixels]);

  const selectedIndices = useMemo(
    () => (selection ? selectionTileIndices(selection) : []),
    [selection]
  );
  const selectedTiles = selectedIndices.map((index) => tiles[index]).filter(Boolean);
  const normalizedSelection = selection ? normalizeSelection(selection) : null;
  const selectedPixelWidth = normalizedSelection
    ? (normalizedSelection.endCol - normalizedSelection.startCol + 1) * TILE_SIZE
    : 0;
  const selectedPixelHeight = normalizedSelection
    ? (normalizedSelection.endRow - normalizedSelection.startRow + 1) * TILE_SIZE
    : 0;
  const selectedHrefs = [
    ...new Set(selectedTiles.map((tile) => tile.href).filter((value): value is string => Boolean(value))),
  ];
  const tileHref = selectedHrefs.length === 1 ? selectedHrefs[0] : "";
  const tileImages = [
    ...new Set(selectedTiles.map((tile) => tile.image).filter((value): value is string => Boolean(value))),
  ];
  const tilePoster = tileImages.length === 1 ? tileImages[0] : "";
  const editorHref = draftHref || tileHref;
  const editorPoster = draftPoster || tilePoster;
  const doorPosters = useMemo(() => posterRegions(tiles), [tiles]);

  const startSelection = (index: number) => {
    const col = index % TILE_COLUMNS;
    const row = Math.floor(index / TILE_COLUMNS);
    anchorRef.current = { col, row };
    draggingRef.current = true;
    setDraftTiles([]);
    setDraftHref("");
    setDraftPoster("");
    setEditorOpen(false);
    setSelection({ startCol: col, startRow: row, endCol: col, endRow: row });
    AudioService.playPop();
  };

  const extendSelection = (index: number) => {
    if (!draggingRef.current || !anchorRef.current) return;
    setSelection({
      startCol: anchorRef.current.col,
      startRow: anchorRef.current.row,
      endCol: index % TILE_COLUMNS,
      endRow: Math.floor(index / TILE_COLUMNS),
    });
  };

  const extendSelectionAtPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || !anchorRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const col = Math.max(
      0,
      Math.min(TILE_COLUMNS - 1, Math.floor(((event.clientX - rect.left) / rect.width) * TILE_COLUMNS))
    );
    const row = Math.max(
      0,
      Math.min(TILE_ROWS - 1, Math.floor(((event.clientY - rect.top) / rect.height) * TILE_ROWS))
    );
    setSelection({
      startCol: anchorRef.current.col,
      startRow: anchorRef.current.row,
      endCol: col,
      endRow: row,
    });
  };

  const saveArtwork = async (
    updates: Array<{ index: number; pixels: string }>,
    href: string,
    poster: string
  ) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret,
        },
        body: JSON.stringify({ action: "seed-pixels", tiles: updates, href, poster }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      await loadTiles();
      setDraftTiles([]);
      setDraftHref("");
      setDraftPoster("");
      setEditorOpen(false);
      onNotice(translate("adminDoorSaved"));
    } catch (err: any) {
      const message = err.message || translate("pixelSaveError");
      onError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <p className="w-full mb-4 font-secondary text-sm text-secondary-light">{translate("adminDoorHint")}</p>

      <div className="pixel-door-guide">
        <span>
          <FaMousePointer />
          {translate("adminDoorSelectHint")}
        </span>
      </div>

      <div className="stall-frame w-full max-w-md">
        <div className="stall-door pixel-door">
          <div className="stall-door__scratches" />
          <div className="stall-door__vents" aria-hidden="true">
            <span className="stall-door__vent" />
            <span className="stall-door__vent" />
            <span className="stall-door__vent" />
            <span className="stall-door__vent" />
          </div>
          <span className="stall-hook" aria-hidden="true" />
          <span className="stall-hinge" style={{ top: 72 }} />
          <span className="stall-hinge" style={{ top: "46%" }} />
          <span className="stall-hinge" style={{ bottom: 64 }} />
          <div className="stall-latch" aria-hidden="true">
            <div className="stall-latch__plate">
              <span className="stall-latch__slider" />
            </div>
            <span className="stall-latch__stamp">{translate("doorOccupied")}</span>
          </div>

          <canvas
            ref={canvasRef}
            width={PIXEL_WIDTH}
            height={PIXEL_HEIGHT}
            className="pixel-door__art"
            aria-label={translate("pixelDoorCanvas")}
          />

          {doorPosters.map((region) => (
            <img
              key={region.id}
              src={region.image}
              alt=""
              className="pixel-door__poster"
              style={{
                left: `${region.left}%`,
                top: `${region.top}%`,
                width: `${region.width}%`,
                height: `${region.height}%`,
              }}
            />
          ))}
          {draftPoster && normalizedSelection && (
            <img
              src={draftPoster}
              alt=""
              className="pixel-door__poster pixel-door__poster--draft"
              style={{
                left: `${(normalizedSelection.startCol / TILE_COLUMNS) * 100}%`,
                top: `${(normalizedSelection.startRow / TILE_ROWS) * 100}%`,
                width: `${
                  ((normalizedSelection.endCol - normalizedSelection.startCol + 1) / TILE_COLUMNS) * 100
                }%`,
                height: `${
                  ((normalizedSelection.endRow - normalizedSelection.startRow + 1) / TILE_ROWS) * 100
                }%`,
              }}
            />
          )}

          <div
            className={`pixel-door__tiles ${
              editorOpen ? "pixel-door__tiles--locked pixel-door__tiles--preview" : ""
            }`}
            onPointerMove={extendSelectionAtPointer}
            style={{
              gridTemplateColumns: `repeat(${TILE_COLUMNS}, 1fr)`,
              gridTemplateRows: `repeat(${TILE_ROWS}, 1fr)`,
            }}
          >
            {tiles.map((tile) => {
              const selected = selectedIndices.includes(tile.index);
              return (
                <button
                  key={tile.index}
                  type="button"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    startSelection(tile.index);
                  }}
                  onPointerEnter={() => extendSelection(tile.index)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      startSelection(tile.index);
                      draggingRef.current = false;
                    }
                  }}
                  className={`pixel-door__tile ${selected ? "pixel-door__tile--selected" : ""} ${
                    tile.owned ? "pixel-door__tile--mine" : ""
                  } ${tile.href ? "pixel-door__tile--link" : ""}`}
                  title={`${translate("pixelBlock")} #${tile.index + 1}${
                    tile.owned ? ` · ${translate("pixelYours")}` : ""
                  }${tile.href ? ` · ${doorHrefHost(tile.href)}` : ""}`}
                  aria-label={`${translate("pixelBlock")} ${tile.index + 1}`}
                />
              );
            })}
          </div>

          {loading && <div className="pixel-door__loading">{translate("adminLoading")}</div>}
          <div className="stall-kick" />
          <div className="stall-door__grime" />
        </div>
      </div>

      {selection && (
        <div className="pixel-purchase-panel w-full max-w-2xl mt-4">
          <div>
            <span className="pixel-purchase-panel__eyebrow">
              {selectedIndices.length} {translate("pixelBlocksSelected")}
            </span>
            <strong>
              {selectedPixelWidth} × {selectedPixelHeight} px
            </strong>
          </div>

          {tileHref && !editorOpen && (
            <a
              href={tileHref}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              className="pixel-purchase-panel__link"
            >
              <FaExternalLinkAlt />
              {translate("pixelOpenLink")} {doorHrefHost(tileHref)}
            </a>
          )}

          {editorOpen ? (
            <PixelDoorEditor
              key={`${normalizedSelection?.startCol}-${normalizedSelection?.startRow}-${normalizedSelection?.endCol}-${normalizedSelection?.endRow}`}
              tiles={mergeTilePixels(tiles, draftTiles)}
              selection={selection}
              saving={saving}
              requiresPayment={false}
              initialHref={editorHref}
              initialPoster={editorPoster}
              hint={translate("adminDoorEditorHint")}
              onCancel={() => setEditorOpen(false)}
              onDraftChange={setDraftTiles}
              onPosterChange={setDraftPoster}
              onSave={saveArtwork}
            />
          ) : (
            <button type="button" onClick={() => setEditorOpen(true)} className="pixel-purchase-panel__action">
              <FaEdit />
              {translate("pixelDrawArea")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
