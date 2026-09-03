import React, { useState, useEffect } from "react";
import { FaTrophy, FaLock, FaCheckCircle, FaTimes } from "react-icons/fa";
import { Achievement, AchievementService } from "../../utils/achievements";
import { translate } from "../../languages/translator";
import { Modal } from "../Modal";
import { AudioService } from "../../utils/audio";

export function TrophyCase() {
  const [isOpen, setIsOpen] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [toastAchievement, setToastAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    setAchievements(AchievementService.getAchievements());

    const unsubscribe = AchievementService.subscribe((unlockedAch) => {
      setAchievements(AchievementService.getAchievements());
      setToastAchievement(unlockedAch);
      setTimeout(() => {
        setToastAchievement(null);
      }, 5000);
    });

    return () => unsubscribe();
  }, []);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const progressPercent = Math.round((unlockedCount / (achievements.length || 1)) * 100);

  return (
    <>
      {/* Floating / Header Trophy Button */}
      <button
        type="button"
        onClick={() => {
          AudioService.playPop();
          setIsOpen(true);
        }}
        aria-label="Conquistas do Trono"
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-background/10 hover:bg-background/20 border border-background/20 text-background font-secondary text-sm transition-transform hover:scale-105 active:scale-95"
      >
        <FaTrophy className="text-amber-400" />
        <span className="hidden sm:inline">{translate("trophyCase")}</span>
        <span className="bg-amber-400 text-amber-950 font-bold font-typewriter text-xs px-1.5 py-0.2 rounded-full">
          {unlockedCount}/{achievements.length}
        </span>
      </button>

      {/* Real-time Achievement Toast Notification */}
      {toastAchievement && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#292420] text-background border-4 border-amber-500 p-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-sm transition-all duration-300 animate-pulse">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-3xl">
            {toastAchievement.icon}
          </div>
          <div>
            <span className="text-xs uppercase font-typewriter text-amber-400 font-bold block">
              {translate("achievementUnlocked")}
            </span>
            <h4 className="font-primary text-xl text-background font-bold">
              {translate(toastAchievement.titleKey)}
            </h4>
            <p className="font-secondary text-xs text-background/80">
              {translate(toastAchievement.descKey)}
            </p>
          </div>
        </div>
      )}

      {/* Trophy Case Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => {
          AudioService.playPop();
          setIsOpen(false);
        }}
        title={translate("throneHallOfFame")}
      >
        <div className="flex flex-col gap-5">
          {/* Progress Bar */}
          <div className="bg-background-dark/70 p-4 rounded-xl border border-primary/20">
            <div className="flex justify-between items-center mb-2 font-secondary text-sm">
              <span className="text-primary-dark font-bold">
                {translate("conquestsUnlocked")}: {unlockedCount} de {achievements.length}
              </span>
              <span className="font-typewriter font-bold text-primary">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-primary/20">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-primary transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Grid of Trophies */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
            {achievements.map((ach) => (
              <div
                key={ach.id}
                className={`p-3.5 rounded-xl border-2 flex items-start gap-3 transition-all ${
                  ach.unlocked
                    ? "bg-amber-50/80 border-amber-400/80 text-secondary shadow-sm"
                    : "bg-gray-100/60 border-gray-300 text-gray-400 opacity-70"
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
                    ach.unlocked ? "bg-amber-200/60" : "bg-gray-200"
                  }`}
                >
                  {ach.unlocked ? ach.icon : <FaLock className="text-gray-400 text-base" />}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h5
                      className={`font-primary text-lg font-bold leading-tight ${
                        ach.unlocked ? "text-primary-dark" : "text-gray-600"
                      }`}
                    >
                      {translate(ach.titleKey)}
                    </h5>
                    {ach.unlocked && <FaCheckCircle className="text-green-600 text-xs ml-1" />}
                  </div>
                  <p className="font-secondary text-xs mt-1 leading-snug">
                    {translate(ach.descKey)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}
