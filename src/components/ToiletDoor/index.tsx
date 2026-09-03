import React, { useState, useEffect } from "react";
import { FaPenAlt, FaTimes, FaCheck, FaLock, FaFilter, FaFire } from "react-icons/fa";
import { DoorMessage } from "../../entities/DoorMessage";
import { translate } from "../../languages/translator";
import { StorageService } from "../../services/storage";
import { Modal } from "../Modal";
import { AudioService } from "../../utils/audio";
import { AchievementService } from "../../utils/achievements";

export function ToiletDoor() {
  const [messages, setMessages] = useState<DoorMessage[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMessageText, setNewMessageText] = useState("");
  const [selectedColor, setSelectedColor] = useState("#1e1b18");
  const [toastMessage, setToastMessage] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  // Local reaction store so users can immediately react and see count bump
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

  const markerColors = [
    { name: "Caneta Preta", value: "#1e1b18" },
    { name: "Azul Bic", value: "#1d4ed8" },
    { name: "Marcador Vermelho", value: "#b91c1c" },
    { name: "Verde Floresta", value: "#047857" },
    { name: "Roxo Choque", value: "#7e22ce" },
    { name: "Laranja", value: "#c2410c" },
  ];

  const handlePostGraffiti = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;

    AudioService.playPaperTear();
    const randomRotation = Math.round((Math.random() * 8 - 4) * 10) / 10; // -4deg to +4deg

    const newMsg: DoorMessage = {
      id: `door-${Date.now()}`,
      message: newMessageText.trim(),
      fontColor: selectedColor,
      font: "Sedgwick Ave",
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
    setTimeout(() => {
      setToastMessage("");
    }, 3000);
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

  const filteredMessages = messages.filter((m) =>
    searchFilter ? (m?.message ? m.message.toLowerCase().includes(searchFilter.toLowerCase()) : false) : true
  );

  return (
    <section id="writeMessage" className="w-full max-w-5xl mx-auto px-4 my-12">
      <div className="flex flex-col items-center">
        {/* Title & Subtitle */}
        <div className="text-center mb-6">
          <h2 className="font-primary text-4xl sm:text-5xl text-background font-bold mb-2">
            {translate("toiletDoor")} 🚪
          </h2>
          <p className="font-secondary text-xl text-background/80">
            {messages.length} {translate("filled")}
          </p>
        </div>

        {/* Action Button & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 w-full max-w-xl justify-center">
          <button
            type="button"
            onClick={() => {
              AudioService.playPop();
              setIsModalOpen(true);
            }}
            className="bg-primary hover:bg-primary-dark text-background font-secondary text-2xl py-3 px-6 rounded-xl shadow-xl border-2 border-background-dark/40 flex items-center gap-3 transition-transform hover:scale-105 active:scale-95"
          >
            <FaPenAlt className="text-xl" />
            <span>{translate("writeMessage")}</span>
            <img src="/dora.webp" alt="Dora" className="w-10 h-10 ml-1" />
          </button>

          {/* Quick Search on Door */}
          <div className="w-full sm:w-auto flex-1 relative">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Buscar pichações na porta..."
              className="w-full py-2.5 px-4 rounded-xl border-2 border-primary-light font-secondary text-base bg-background-dark/90 text-secondary placeholder-secondary-light/60 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-secondary-light hover:text-secondary"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="bg-green-700 text-white font-secondary text-lg px-6 py-2 rounded-xl mb-4 shadow-lg animate-fade-in flex items-center gap-2">
            <FaCheck />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* The Wooden Stall Door */}
        <div className="relative w-full bg-[#c99a6b] border-8 border-[#292420] rounded-2xl p-6 sm:p-10 shadow-2xl min-h-[460px] overflow-hidden select-none">
          {/* Stall Door Metal Lock Latch & Hinges */}
          <div className="absolute top-8 right-6 w-8 h-16 bg-neutral-700 rounded-sm border-2 border-neutral-900 shadow-md flex flex-col items-center justify-center">
            <FaLock className="text-amber-400 text-sm mb-1" />
            <div className="w-4 h-2 bg-neutral-800 rounded-full" />
          </div>

          <div className="absolute top-1/2 right-6 -translate-y-1/2 w-6 h-24 bg-neutral-800 rounded-sm shadow-md" />

          {/* Wood Planks Lines */}
          <div className="absolute inset-0 pointer-events-none opacity-15 flex justify-between">
            <div className="w-1/3 border-r-2 border-[#543d2b] h-full" />
            <div className="w-1/3 border-r-2 border-[#543d2b] h-full" />
          </div>

          {/* Graffiti Messages Grid / Scatter */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 items-start py-4">
            {filteredMessages.length === 0 ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center text-center">
                <p className="font-write text-3xl sm:text-4xl text-[#543d2b] drop-shadow-sm mb-2">
                  {searchFilter ? "Nenhum recado encontrado para essa busca." : "Esta porta ainda está em branco!"}
                </p>
                <p className="font-secondary text-lg sm:text-xl text-[#3d2c1e]">
                  Seja o primeiro a deixar seu recado, desabafo ou filosofia de trono.
                </p>
              </div>
            ) : (
              filteredMessages.map((msg, index) => {
                const reactionData = localReactions[msg.id] || { poop: 0, laugh: 0, fire: 0 };
                return (
                  <div
                    key={msg.id || index}
                    className="p-4 rounded-xl bg-black/5 hover:bg-black/10 border border-black/10 backdrop-blur-[1px] transition-all hover:scale-105 cursor-default shadow-sm flex flex-col justify-between group"
                    style={{
                      ...msg.style,
                      color: msg.fontColor || "#1e1b18",
                    }}
                  >
                    <p className="font-write text-xl sm:text-2xl leading-snug break-words mb-3">
                      "{msg.message}"
                    </p>

                    {/* Interactive Reactions on Door Message */}
                    <div className="flex items-center gap-2 pt-2 border-t border-black/10 text-xs font-typewriter">
                      <button
                        type="button"
                        onClick={() => handleReact(msg.id, "poop")}
                        title="Reagir com 💩"
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/10 hover:bg-black/20 transition-transform active:scale-95"
                      >
                        <span>💩</span>
                        <span>{reactionData.poop}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReact(msg.id, "laugh")}
                        title="Reagir com 😂"
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/10 hover:bg-black/20 transition-transform active:scale-95"
                      >
                        <span>😂</span>
                        <span>{reactionData.laugh}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReact(msg.id, "fire")}
                        title="Reagir com 🔥"
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/10 hover:bg-black/20 transition-transform active:scale-95"
                      >
                        <span>🔥</span>
                        <span>{reactionData.fire}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Graffiti Writer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={translate("addNewMessage")}
      >
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
              className="w-full p-4 rounded-xl border-2 border-primary-dark font-write text-2xl text-secondary bg-white focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
              style={{ color: selectedColor }}
            />
            <span className="text-xs font-secondary text-secondary-light float-right mt-1">
              {newMessageText.length}/180 caracteres
            </span>
          </div>

          {/* Color Picker */}
          <div>
            <span className="block font-secondary text-primary-dark font-semibold text-base mb-2">
              {translate("inkColor")}
            </span>
            <div className="flex flex-wrap gap-3 items-center">
              {markerColors.map((col) => (
                <button
                  key={col.value}
                  type="button"
                  title={col.name}
                  onClick={() => {
                    AudioService.playPop();
                    setSelectedColor(col.value);
                  }}
                  className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center ${
                    selectedColor === col.value
                      ? "border-primary scale-110 ring-2 ring-primary/50"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: col.value }}
                >
                  {selectedColor === col.value && (
                    <FaCheck className="text-white text-xs drop-shadow" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
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
