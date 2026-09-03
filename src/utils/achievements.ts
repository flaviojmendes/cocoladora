import { AudioService } from "./audio";

export interface Achievement {
  id: string;
  titleKey: string;
  descKey: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

const ACHIEVEMENTS_KEY = "cocoladora_throne_achievements";

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_calc",
    titleKey: "ach_first_calc_title",
    descKey: "ach_first_calc_desc",
    icon: "💸",
    unlocked: false,
  },
  {
    id: "deep_meditation",
    titleKey: "ach_deep_meditation_title",
    descKey: "ach_deep_meditation_desc",
    icon: "⏱️",
    unlocked: false,
  },
  {
    id: "tingle_survivor",
    titleKey: "ach_tingle_survivor_title",
    descKey: "ach_tingle_survivor_desc",
    icon: "🦵",
    unlocked: false,
  },
  {
    id: "roll_master",
    titleKey: "ach_roll_master_title",
    descKey: "ach_roll_master_desc",
    icon: "🧻",
    unlocked: false,
  },
  {
    id: "shampoo_reader",
    titleKey: "ach_shampoo_reader_title",
    descKey: "ach_shampoo_reader_desc",
    icon: "🧴",
    unlocked: false,
  },
  {
    id: "graffiti_artist",
    titleKey: "ach_graffiti_artist_title",
    descKey: "ach_graffiti_artist_desc",
    icon: "✍️",
    unlocked: false,
  },
  {
    id: "restroom_critic",
    titleKey: "ach_restroom_critic_title",
    descKey: "ach_restroom_critic_desc",
    icon: "⭐",
    unlocked: false,
  },
  {
    id: "throne_persona",
    titleKey: "ach_throne_persona_title",
    descKey: "ach_throne_persona_desc",
    icon: "👑",
    unlocked: false,
  },
  {
    id: "annual_visionary",
    titleKey: "ach_annual_visionary_title",
    descKey: "ach_annual_visionary_desc",
    icon: "📊",
    unlocked: false,
  },
];

type AchievementListener = (achievement: Achievement) => void;

class AchievementManager {
  private listeners: AchievementListener[] = [];

  public getAchievements(): Achievement[] {
    try {
      const stored = localStorage.getItem(ACHIEVEMENTS_KEY);
      if (!stored) return INITIAL_ACHIEVEMENTS;
      const parsed: Record<string, { unlocked: boolean; unlockedAt?: string }> = JSON.parse(stored);

      return INITIAL_ACHIEVEMENTS.map((ach) => {
        const item = parsed[ach.id];
        return {
          ...ach,
          unlocked: item?.unlocked || false,
          unlockedAt: item?.unlockedAt,
        };
      });
    } catch {
      return INITIAL_ACHIEVEMENTS;
    }
  }

  public getUnlockedCount(): { unlocked: number; total: number } {
    const list = this.getAchievements();
    const unlocked = list.filter((a) => a.unlocked).length;
    return { unlocked, total: list.length };
  }

  public unlock(id: string): Achievement | null {
    const list = this.getAchievements();
    const target = list.find((a) => a.id === id);
    if (!target || target.unlocked) return null;

    target.unlocked = true;
    target.unlockedAt = new Date().toISOString();

    const toStore: Record<string, { unlocked: boolean; unlockedAt?: string }> = {};
    list.forEach((item) => {
      if (item.unlocked) {
        toStore[item.id] = { unlocked: true, unlockedAt: item.unlockedAt };
      }
    });

    try {
      localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(toStore));
    } catch {}

    // Play fanfare
    AudioService.playTada();

    // Notify listeners
    this.listeners.forEach((listener) => {
      try {
        listener(target);
      } catch {}
    });

    return target;
  }

  public subscribe(listener: AchievementListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}

export const AchievementService = new AchievementManager();
