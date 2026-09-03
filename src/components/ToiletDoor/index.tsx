import React, { useState, useEffect } from "react";
import { FaPenAlt, FaTimes, FaCheck, FaLock } from "react-icons/fa";
import { DoorMessage } from "../../entities/DoorMessage";
import { translate } from "../../languages/translator";
import { StorageService } from "../../services/storage";
import { Modal } from "../Modal";

export function ToiletDoor() {
  const [messages, setMessages] = useState<DoorMessage[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMessageText, setNewMessageText] = useState("");
  const [selectedColor, setSelectedColor] = useState("#1e1b18");
  const [toastMessage, setToastMessage] = useState("");

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

    const randomRotation = Math.round((Math.random() * 8 - 4) * 10) / 10; // -4deg to +4deg

    const newMsg: DoorMessage = {
      id: `door-${Date.now()}`,
      message: newMessageText.trim(),
      fontColor: selectedColor,
      font: "Sedgwick Ave",
      style: {
        transform: `rotate(${randomRotation}deg)`,
      },
    };

    const updated = await StorageService.addDoorMessage(newMsg);
    setMessages(updated);
    setNewMessageText("");
    setIsModalOpen(false);

    setToastMessage(translate("graffitiSuccess"));
    setTimeout(() => {
      setToastMessage("");
    }, 3000);
  };

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

        {/* Action Button */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary-dark text-background font-secondary text-2xl py-3 px-6 rounded-xl mb-6 shadow-xl border-2 border-background-dark/40 flex items-center gap-3 transition-transform hover:scale-105 active:scale-95"
        >
          <FaPenAlt className="text-xl" />
          <span>{translate("writeMessage")}</span>
          <img src="/dora.webp" alt="Dora" className="w-12 h-12 ml-1" />
        </button>

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
            {messages.length === 0 ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center text-center">
                <p className="font-write text-3xl sm:text-4xl text-[#543d2b] drop-shadow-sm mb-2">
                  Esta porta ainda está em branco!
                </p>
                <p className="font-secondary text-lg sm:text-xl text-[#3d2c1e]">
                  Seja o primeiro a deixar seu recado, desabafo ou filosofia de trono.
                </p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={msg.id || index}
                  className="p-3.5 rounded-lg bg-black/5 hover:bg-black/10 border border-black/10 backdrop-blur-[1px] transition-all hover:scale-105 cursor-default shadow-sm"
                  style={{
                    ...msg.style,
                    color: msg.fontColor || "#1e1b18",
                  }}
                >
                  <p className="font-write text-xl sm:text-2xl leading-snug break-words">
                    "{msg.message}"
                  </p>
                </div>
              ))
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
                  onClick={() => setSelectedColor(col.value)}
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
