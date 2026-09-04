import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FaCheck,
  FaCopy,
  FaEdit,
  FaKey,
  FaLock,
  FaMousePointer,
  FaShoppingCart,
} from "react-icons/fa";
import { DoorPixelTile, PixelSelection } from "../../entities/DoorPixel";
import { translate } from "../../languages/translator";
import { ApiService } from "../../services/api";
import {
  PIXEL_HEIGHT,
  PIXEL_OWNER_TOKEN_KEY,
  PIXEL_PALETTE,
  PIXEL_WIDTH,
  TILE_COLUMNS,
  TILE_ROWS,
  TILE_SIZE,
  composeDoorPixels,
  emptyPixelTiles,
  formatBRL,
  getPixelOwnerToken,
  normalizeSelection,
  selectionMinimumBid,
  selectionTileIndices,
} from "../../utils/pixelDoor";
import { AudioService } from "../../utils/audio";
import { Modal } from "../Modal";
import { PixelDoorEditor } from "../PixelDoorEditor";

function selectionFromIndices(indices: number[]): PixelSelection | null {
  if (!indices.length) return null;
  const cols = indices.map((index) => index % TILE_COLUMNS);
  const rows = indices.map((index) => Math.floor(index / TILE_COLUMNS));
  return {
    startCol: Math.min(...cols),
    startRow: Math.min(...rows),
    endCol: Math.max(...cols),
    endRow: Math.max(...rows),
  };
}

function formatBidInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function parseBidInput(value: string): number {
  const trimmed = value.trim();
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  return Math.round(Number(normalized) * 100);
}

export function ToiletDoor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef(false);
  const anchorRef = useRef<{ col: number; row: number } | null>(null);
  const [ownerToken, setOwnerToken] = useState(getPixelOwnerToken);
  const [tiles, setTiles] = useState<DoorPixelTile[]>(emptyPixelTiles);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selection, setSelection] = useState<PixelSelection | null>(null);
  const [bidInput, setBidInput] = useState("5,00");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [savingArt, setSavingArt] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [keyInput, setKeyInput] = useState("");

  const loadTiles = useCallback(async () => {
    try {
      const data = await ApiService.getDoorPixelTiles(ownerToken);
      setTiles(data);
      setError("");
      return data;
    } catch (err: any) {
      setError(err.message || translate("pixelLoadError"));
      return null;
    } finally {
      setLoading(false);
    }
  }, [ownerToken]);

  useEffect(() => {
    loadTiles();
  }, [loadTiles]);

  useEffect(() => {
    const stopDragging = () => {
      draggingRef.current = false;
    };
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
    return () => {
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("pixel_checkout");
    const sessionId = params.get("session_id");
    if (result === "cancelled") {
      setNotice(translate("pixelPaymentCancelled"));
      window.history.replaceState({}, "", `${window.location.pathname}#writeMessage`);
      return;
    }
    if (result !== "success" || !sessionId) return;

    let cancelled = false;
    async function confirmPurchase() {
      setNotice(translate("pixelConfirmingPayment"));
      for (let attempt = 0; attempt < 15 && !cancelled; attempt += 1) {
        try {
          const order = await ApiService.getPixelCheckoutStatus(sessionId!);
          if (order.status === "completed") {
            const refreshed = await loadTiles();
            if (refreshed && !cancelled) {
              const purchased = selectionFromIndices(order.tileIndices);
              setSelection(purchased);
              setNotice(translate("pixelPurchaseSuccess"));
              setEditorOpen(Boolean(purchased));
              window.history.replaceState({}, "", `${window.location.pathname}#writeMessage`);
            }
            return;
          }
          if (order.status === "cancelled" || order.status === "failed") {
            setNotice(translate("pixelPaymentCancelled"));
            return;
          }
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      if (!cancelled) setNotice(translate("pixelPaymentPending"));
    }
    confirmPurchase();
    return () => {
      cancelled = true;
    };
  }, [loadTiles]);

  const allPixels = useMemo(() => composeDoorPixels(tiles), [tiles]);

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
  const mineCount = selectedTiles.filter((tile) => tile.mine).length;
  const selectionIsMine = selectedTiles.length > 0 && mineCount === selectedTiles.length;
  const selectionIsMixed = mineCount > 0 && mineCount < selectedTiles.length;
  const selectionReserved = selectedTiles.some((tile) => tile.reserved && !tile.mine);
  const minimumBid = selectionMinimumBid(tiles, selectedIndices);
  const normalizedSelection = selection ? normalizeSelection(selection) : null;
  const selectedPixelWidth = normalizedSelection
    ? (normalizedSelection.endCol - normalizedSelection.startCol + 1) * TILE_SIZE
    : 0;
  const selectedPixelHeight = normalizedSelection
    ? (normalizedSelection.endRow - normalizedSelection.startRow + 1) * TILE_SIZE
    : 0;

  useEffect(() => {
    if (selectedIndices.length && !selectionIsMine) {
      setBidInput(formatBidInput(minimumBid));
    }
  }, [minimumBid, selectedIndices.length, selectionIsMine]);

  const startSelection = (index: number) => {
    const col = index % TILE_COLUMNS;
    const row = Math.floor(index / TILE_COLUMNS);
    anchorRef.current = { col, row };
    draggingRef.current = true;
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

  const checkout = async () => {
    if (!selectedIndices.length || selectionIsMine || selectionIsMixed || selectionReserved) return;
    const bidTotalCents = parseBidInput(bidInput);
    if (!Number.isFinite(bidTotalCents) || bidTotalCents < minimumBid) {
      setError(`${translate("pixelMinimumBid")} ${formatBRL(minimumBid)}.`);
      return;
    }
    setCheckoutLoading(true);
    setError("");
    try {
      const result = await ApiService.createPixelCheckout({
        ownerToken,
        tileIndices: selectedIndices,
        bidTotalCents,
      });
      window.location.assign(result.checkoutUrl);
    } catch (err: any) {
      setError(err.message || translate("pixelCheckoutError"));
      await loadTiles();
    } finally {
      setCheckoutLoading(false);
    }
  };

  const saveArtwork = async (updates: Array<{ index: number; pixels: string }>) => {
    setSavingArt(true);
    setError("");
    try {
      await ApiService.saveDoorPixelTiles(ownerToken, updates);
      await loadTiles();
      setEditorOpen(false);
      setNotice(translate("pixelArtSaved"));
    } catch (err: any) {
      setError(err.message || translate("pixelSaveError"));
    } finally {
      setSavingArt(false);
    }
  };

  const importOwnerKey = () => {
    const next = keyInput.trim();
    if (!/^[a-zA-Z0-9_-]{16,128}$/.test(next)) {
      setError(translate("pixelOwnerKeyInvalid"));
      return;
    }
    try {
      localStorage.setItem(PIXEL_OWNER_TOKEN_KEY, next);
    } catch {}
    setOwnerToken(next);
    setSelection(null);
    setKeyModalOpen(false);
    setKeyInput("");
    setNotice(translate("pixelOwnerKeyImported"));
  };

  return (
    <section id="writeMessage" className="stall-alcove w-full my-12 py-10 px-4">
      <div className="flex flex-col items-center max-w-[38rem] mx-auto">
        <div className="text-center mb-6">
          <h2 className="font-primary text-4xl sm:text-5xl text-background font-bold mb-2">
            {translate("pixelDoorTitle")}
          </h2>
          <p className="font-secondary text-xl text-background/85">
            {translate("pixelDoorSubtitle")}
          </p>
          <p className="font-typewriter text-xs text-background/60 mt-2">
            {PIXEL_WIDTH} × {PIXEL_HEIGHT} px · {TILE_COLUMNS * TILE_ROWS}{" "}
            {translate("pixelBlocks")} · {translate("pixelStartAt")} {formatBRL(500)}
          </p>
        </div>

        <div className="pixel-door-guide">
          <span>
            <FaMousePointer />
            {translate("pixelSelectHint")}
          </span>
          <button type="button" onClick={() => setKeyModalOpen(true)}>
            <FaKey /> {translate("pixelOwnerKey")}
          </button>
        </div>

        {notice && (
          <div className="w-full bg-emerald-900/80 text-background font-secondary px-4 py-2 mb-4 flex items-center gap-2">
            <FaCheck />
            <span>{notice}</span>
          </div>
        )}
        {error && (
          <div className="w-full bg-red-950/80 text-red-50 font-secondary px-4 py-2 mb-4">{error}</div>
        )}

        <div className="stall-frame w-full">
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

            <div
              className="pixel-door__tiles"
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
                      tile.mine ? "pixel-door__tile--mine" : ""
                    } ${tile.reserved ? "pixel-door__tile--reserved" : ""}`}
                    title={`${translate("pixelBlock")} #${tile.index + 1} · ${
                      tile.mine ? translate("pixelYours") : formatBRL(tile.priceCents)
                    }`}
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
          <div className="pixel-purchase-panel w-full">
            <div>
              <span className="pixel-purchase-panel__eyebrow">
                {selectedIndices.length} {translate("pixelBlocksSelected")}
              </span>
              <strong>
                {selectedPixelWidth} × {selectedPixelHeight} px
              </strong>
            </div>

            {selectionIsMixed ? (
              <p className="pixel-purchase-panel__warning">{translate("pixelMixedSelection")}</p>
            ) : selectionIsMine ? (
              <button
                type="button"
                onClick={() => setEditorOpen(true)}
                className="pixel-purchase-panel__action"
              >
                <FaEdit /> {translate("pixelEditMine")}
              </button>
            ) : (
              <>
                <label className="pixel-bid-field">
                  <span>
                    {translate("pixelYourBid")} ({translate("pixelMinimumBid")}{" "}
                    {formatBRL(minimumBid)})
                  </span>
                  <span className="pixel-bid-field__input">
                    R$
                    <input
                      value={bidInput}
                      onChange={(event) => setBidInput(event.target.value)}
                      inputMode="decimal"
                      aria-label={translate("pixelYourBid")}
                    />
                  </span>
                </label>
                <button
                  type="button"
                  onClick={checkout}
                  disabled={checkoutLoading || selectionReserved}
                  className="pixel-purchase-panel__action"
                >
                  <FaShoppingCart />
                  {checkoutLoading
                    ? translate("pixelOpeningStripe")
                    : selectionReserved
                      ? translate("pixelReserved")
                      : translate("pixelBuyWithStripe")}
                </button>
                <p className="pixel-purchase-panel__fineprint">
                  <FaLock /> {translate("pixelStripeHint")}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={editorOpen && Boolean(selection)}
        onClose={() => setEditorOpen(false)}
        title={translate("pixelEditorTitle")}
        maxWidth="max-w-2xl"
      >
        {selection && (
          <PixelDoorEditor
            tiles={tiles}
            selection={selection}
            saving={savingArt}
            onCancel={() => setEditorOpen(false)}
            onSave={saveArtwork}
          />
        )}
      </Modal>

      <Modal
        isOpen={keyModalOpen}
        onClose={() => setKeyModalOpen(false)}
        title={translate("pixelOwnerKeyTitle")}
        maxWidth="max-w-lg"
      >
        <div className="flex flex-col gap-4">
          <p className="font-secondary text-secondary-light">{translate("pixelOwnerKeyHint")}</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={ownerToken}
              className="min-w-0 flex-1 py-2 px-3 border-2 border-primary-dark bg-white font-typewriter text-xs"
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(ownerToken);
                  setNotice(translate("pixelOwnerKeyCopied"));
                } catch {
                  setError(translate("pixelCopyKeyError"));
                }
              }}
              className="px-4 bg-primary text-background font-secondary flex items-center gap-2"
            >
              <FaCopy /> {translate("pixelCopyKey")}
            </button>
          </div>
          <div className="border-t-2 border-primary/20 pt-4">
            <label className="block font-secondary text-primary-dark mb-1" htmlFor="pixel-owner-key">
              {translate("pixelUseExistingKey")}
            </label>
            <div className="flex gap-2">
              <input
                id="pixel-owner-key"
                value={keyInput}
                onChange={(event) => setKeyInput(event.target.value)}
                className="min-w-0 flex-1 py-2 px-3 border-2 border-primary-dark bg-white font-typewriter text-xs"
                placeholder={translate("pixelPasteKey")}
              />
              <button
                type="button"
                onClick={importOwnerKey}
                className="px-4 bg-secondary text-background font-secondary"
              >
                {translate("pixelUseKey")}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </section>
  );
}

