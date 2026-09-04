import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaCheck, FaPenAlt } from "react-icons/fa";
import { DoorMessage } from "../../entities/DoorMessage";
import { translate } from "../../languages/translator";
import { StorageService } from "../../services/storage";
import { Modal } from "../Modal";
import { AudioService } from "../../utils/audio";
import { AchievementService } from "../../utils/achievements";

const HAND_FONTS = [
  "Sedgwick Ave",
  "Permanent Marker",
  "Rock Salt",
  "Rubik Wet Paint",
  "Teko",
] as const;

const MARKER_COLORS = [
  { name: "Caneta Preta", value: "#1a1410" },
  { name: "Azul Bic", value: "#1e3a8a" },
  { name: "Marcador Vermelho", value: "#9b1c1c" },
  { name: "Verde", value: "#14532d" },
  { name: "Roxo", value: "#6b21a8" },
  { name: "Laranja", value: "#9a3412" },
  { name: "Giz", value: "#f3efe3" },
  { name: "Prata", value: "#d6d3d1" },
];

type HandStyle = "marker" | "fat" | "scratch" | "spray" | "pixa";
type Doodle = "none" | "underline" | "star" | "arrow";

type GraffitiLayout = {
  x: number;
  y: number;
  w: number;
  rot: number;
  fontSize: number;
  hand: HandStyle;
  z: number;
  doodle: Doodle;
  light: boolean;
};

function hash32(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function unit(h: number, shift: number): number {
  return ((h >>> shift) & 1023) / 1023;
}

function isLightColor(hex?: string): boolean {
  if (!hex) return false;
  const raw = hex.replace("#", "");
  if (raw.length < 6) return false;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 168;
}

function parseRotation(style?: { transform?: string }): number {
  if (!style?.transform) return 0;
  const match = style.transform.match(/rotate\(([-0-9.]+)deg\)/);
  return match ? parseFloat(match[1]) || 0 : 0;
}

function pickHand(font: string | undefined, h: number, short: boolean): HandStyle {
  const known = (font || "").toLowerCase();
  if (known.includes("permanent")) return "fat";
  if (known.includes("rock")) return "scratch";
  if (known.includes("wet")) return "spray";
  if (known.includes("teko")) return "pixa";
  const options: HandStyle[] = short
    ? ["marker", "fat", "scratch", "spray", "pixa"]
    : ["marker", "fat", "scratch", "spray"];
  return options[Math.floor(unit(h, 8) * options.length)] || "marker";
}

function layoutMessages(
  messages: DoorMessage[],
  cols: number,
  doorWidth: number
): { layouts: GraffitiLayout[]; height: number } {
  const padX = 22;
  const padTop = 58;
  const padRight = 46;
  const padBottom = 52;
  const innerW = Math.max(160, doorWidth - padX - padRight);
  const colW = innerW / cols;
  const colY = new Array(cols).fill(padTop);
  const scale = Math.min(1.08, Math.max(0.82, doorWidth / 380));

  const layouts = messages.map((msg, i) => {
    const h = hash32(msg.id || `${i}-${msg.message}`);
    const text = msg.message || "";
    const short = text.length < 28;
    const long = text.length > 90;
    const hand = pickHand(msg.font, h, short);

    let col = unit(h, 0) > 0.38 ? colY.indexOf(Math.min(...colY)) : i % cols;
    col = Math.max(0, Math.min(cols - 1, col));

    const jitterX = (unit(h, 4) - 0.5) * (colW * 0.24);
    const wFactor = short ? 0.7 + unit(h, 12) * 0.3 : long ? 0.92 : 0.76 + unit(h, 12) * 0.2;
    const w = Math.min(colW * 1.18, Math.max(96, colW * wFactor));
    let x = padX + col * colW + jitterX;
    x = Math.max(padX, Math.min(doorWidth - padRight - w, x));

    let fontSize = (short ? 21 + unit(h, 16) * 13 : long ? 15 + unit(h, 16) * 4 : 16.5 + unit(h, 16) * 8) * scale;
    if (hand === "scratch") fontSize *= 0.84;
    if (hand === "pixa") fontSize *= 1.12;
    if (hand === "fat") fontSize *= 1.06;

    const storedRot = parseRotation(msg.style);
    const swing = hand === "pixa" ? 7 : 16;
    const rot = storedRot + (unit(h, 20) - 0.5) * swing * 2;

    const lines = Math.max(1, Math.ceil((text.length * fontSize * 0.52) / Math.max(w, 80)));
    const blockH = lines * fontSize * (hand === "pixa" ? 1.08 : 1.28) + 26;
    const overlap = 0.58 + unit(h, 24) * 0.2;
    const y = colY[col] + (unit(h, 2) - 0.4) * 14;
    colY[col] += blockH * overlap;

    const doodleRoll = unit(h, 6);
    const doodle: Doodle =
      doodleRoll > 0.88 ? "star" : doodleRoll > 0.8 ? "underline" : doodleRoll > 0.74 ? "arrow" : "none";

    return {
      x,
      y,
      w,
      rot,
      fontSize,
      hand,
      z: 10 + (i % 8),
      doodle,
      light: isLightColor(msg.fontColor),
    };
  });

  const height = Math.max(620, Math.max(padTop, ...colY) + padBottom);
  return { layouts, height };
}

function DoodleMark({ type, color }: { type: Doodle; color: string }) {
  if (type === "none") return null;
  if (type === "underline") {
    return (
      <svg className="graffiti-doodle" viewBox="0 0 80 10" width="72" height="10" style={{ left: 4, bottom: -6 }}>
        <path d="M2 6 C18 1 36 11 52 5 C62 2 72 8 78 4" fill="none" stroke={color} strokeWidth="1.4" />
      </svg>
    );
  }
  if (type === "star") {
    return (
      <svg className="graffiti-doodle" viewBox="0 0 20 20" width="16" height="16" style={{ right: -8, top: -8 }}>
        <path d="M10 1 L12 7 H18 L13 11 L15 17 L10 13 L5 17 L7 11 L2 7 H8 Z" fill={color} />
      </svg>
    );
  }
  return (
    <svg className="graffiti-doodle" viewBox="0 0 28 12" width="26" height="12" style={{ right: -10, top: 8 }}>
      <path d="M1 6 H20 M16 2 L22 6 L16 10" fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export function ToiletDoor() {
  const doorRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<DoorMessage[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMessageText, setNewMessageText] = useState("");
  const [selectedColor, setSelectedColor] = useState("#1a1410");
  const [toastMessage, setToastMessage] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [doorWidth, setDoorWidth] = useState(360);

  const [localReactions, setLocalReactions] = useState<
    Record<string, { poop: number; laugh: number; fire: number }>
  >(() => {
    try {
      const saved = localStorage.getItem("cocoladora_door_reactions");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    StorageService.getDoorMessages().then((data) => setMessages(data));
  }, []);

  useEffect(() => {
    const el = doorRef.current;
    if (!el) return;
    const update = () => setDoorWidth(el.clientWidth || 360);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handlePostGraffiti = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;

    AudioService.playPaperTear();
    const wild = Math.random() > 0.88 ? 1.5 : 1;
    const randomRotation = Math.round((Math.random() * 22 - 11) * wild * 10) / 10;
    const font = HAND_FONTS[Math.floor(Math.random() * HAND_FONTS.length)];

    const newMsg: DoorMessage = {
      id: `door-${Date.now()}`,
      message: newMessageText.trim(),
      fontColor: selectedColor,
      font,
      style: {
        transform: `rotate(${randomRotation}deg)`,
      },
      reactions: { poop: 0, laugh: 0, fire: 0 },
    };

    const updated = await StorageService.addDoorMessage(newMsg);
    setMessages(updated);
    setNewMessageText("");
    setIsModalOpen(false);
    AchievementService.unlock("graffiti_artist");
    setToastMessage(translate("graffitiSuccess"));
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleReact = (msgId: string, type: "poop" | "laugh" | "fire") => {
    AudioService.playPop();
    setLocalReactions((prev) => {
      const cur = prev[msgId] || { poop: 0, laugh: 0, fire: 0 };
      const next = {
        ...prev,
        [msgId]: {
          ...cur,
          [type]: cur[type] + 1,
        },
      };
      try {
        localStorage.setItem("cocoladora_door_reactions", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const filteredMessages = useMemo(
    () =>
      messages.filter((m) =>
        searchFilter
          ? m?.message
            ? m.message.toLowerCase().includes(searchFilter.toLowerCase())
            : false
          : true
      ),
    [messages, searchFilter]
  );

  const cols = doorWidth < 400 ? 2 : 3;
  const { layouts, height } = useMemo(
    () => layoutMessages(filteredMessages, cols, doorWidth),
    [filteredMessages, cols, doorWidth]
  );

  const inputClass =
    "w-full py-2.5 px-4 rounded-xl border-2 border-primary-light font-secondary text-base bg-background-dark/90 text-secondary placeholder-secondary-light/70 focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <section id="writeMessage" className="stall-alcove w-full my-12 py-10 px-4">
      <div className="flex flex-col items-center max-w-[34rem] mx-auto">
        <div className="text-center mb-6">
          <h2 className="font-primary text-4xl sm:text-5xl text-background font-bold mb-2">
            {translate("toiletDoor")}
          </h2>
          <p className="font-secondary text-xl text-background/80">
            {messages.length} {translate("filled")}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6 w-full">
          <button
            type="button"
            onClick={() => {
              AudioService.playPop();
              setIsModalOpen(true);
            }}
            className="bg-primary hover:bg-primary-dark text-background font-secondary text-2xl py-3 px-5 rounded-xl shadow-xl border-2 border-background-dark/40 flex items-center justify-center gap-3 transition-transform hover:scale-[1.02] active:scale-95"
          >
            <FaPenAlt className="text-lg" />
            <span>{translate("writeMessage")}</span>
            <img src="/dora.webp" alt="" className="w-9 h-9" />
          </button>

          <div className="relative flex-1">
            <input
              type="search"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder={translate("doorSearch")}
              className={inputClass}
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-secondary text-secondary hover:text-primary"
              >
                {translate("doorClear")}
              </button>
            )}
          </div>
        </div>

        {toastMessage && (
          <div className="bg-green-800 text-background font-secondary text-lg px-5 py-2 rounded-xl mb-4 shadow-lg flex items-center gap-2">
            <FaCheck />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="stall-frame w-full">
          <div ref={doorRef} className="stall-door w-full select-none" style={{ minHeight: height }}>
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

            <div className="stall-door__writing" style={{ height }}>
              {filteredMessages.length === 0 ? (
                <p
                  className="absolute left-1/2 top-[42%] -translate-x-1/2 -rotate-6 font-scratch text-xl sm:text-2xl text-[#2c1c12] text-center px-6"
                  style={{ mixBlendMode: "multiply", opacity: 0.55 }}
                >
                  {searchFilter ? translate("doorNoResults") : translate("doorEmpty")}
                  {!searchFilter && (
                    <span className="block mt-2 font-write text-lg">{translate("doorEmptyHint")}</span>
                  )}
                </p>
              ) : (
                filteredMessages.map((msg, index) => {
                  const layout = layouts[index];
                  if (!layout) return null;
                  const reactionData = localReactions[msg.id] || { poop: 0, laugh: 0, fire: 0 };
                  const color = msg.fontColor || "#1a1410";
                  return (
                    <article
                      key={msg.id || index}
                      className={`graffiti graffiti--${layout.hand} ${
                        layout.light ? "graffiti--chalk" : "graffiti--ink"
                      }`}
                      style={{
                        left: layout.x,
                        top: layout.y,
                        width: layout.w,
                        transform: `rotate(${layout.rot}deg)`,
                        color,
                        fontSize: layout.fontSize,
                        zIndex: layout.z,
                      }}
                    >
                      <p>{msg.message}</p>
                      <DoodleMark type={layout.doodle} color={color} />
                      <div className="graffiti__ticks">
                        <button type="button" onClick={() => handleReact(msg.id, "poop")} title="💩" aria-label="💩">
                          💩{reactionData.poop || ""}
                        </button>
                        <button type="button" onClick={() => handleReact(msg.id, "laugh")} title="😂" aria-label="😂">
                          😂{reactionData.laugh || ""}
                        </button>
                        <button type="button" onClick={() => handleReact(msg.id, "fire")} title="🔥" aria-label="🔥">
                          🔥{reactionData.fire || ""}
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            <div className="stall-kick" />
            <div className="stall-door__grime" />
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={translate("addNewMessage")}>
        <form onSubmit={handlePostGraffiti} className="flex flex-col gap-4">
          <div>
            <label className="block font-secondary text-primary-dark font-semibold text-lg mb-1">
              {translate("messagePlaceholder")}
            </label>
            <textarea
              required
              rows={4}
              maxLength={180}
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              placeholder="Ex: Boss makes a dollar, I make a dime..."
              className="w-full p-4 rounded-xl border-2 border-primary-dark font-write text-2xl bg-white focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
              style={{ color: selectedColor }}
            />
            <span className="text-xs font-secondary text-secondary-light float-right mt-1">
              {newMessageText.length}/180 caracteres
            </span>
          </div>

          <div>
            <span className="block font-secondary text-primary-dark font-semibold text-base mb-2">
              {translate("inkColor")}
            </span>
            <div className="flex flex-wrap gap-3 items-center">
              {MARKER_COLORS.map((col) => (
                <button
                  key={col.value}
                  type="button"
                  title={col.name}
                  onClick={() => {
                    AudioService.playPop();
                    setSelectedColor(col.value);
                  }}
                  className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center ${
                    selectedColor === col.value ? "border-primary scale-110 ring-2 ring-primary/50" : "border-transparent"
                  }`}
                  style={{ backgroundColor: col.value }}
                >
                  {selectedColor === col.value && (
                    <FaCheck
                      className={`text-xs drop-shadow ${
                        col.value === "#f3efe3" || col.value === "#d6d3d1"
                          ? "text-secondary"
                          : "text-white"
                      }`}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="w-1/3 py-3 rounded-xl font-secondary text-xl text-secondary bg-background-dark hover:bg-neutral-200 transition-colors"
            >
              {translate("cancel")}
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl font-secondary text-2xl font-bold bg-primary hover:bg-primary-dark text-background shadow-lg transition-transform active:translate-y-0.5"
            >
              {translate("postGraffiti")}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
