import { Location } from "../entities/Location";
import { Place } from "../entities/Place";
import { DoorMessage } from "../entities/DoorMessage";
import { SalaryConfig } from "../entities/SalaryConfig";

const SALARY_CONFIG_KEY = "cocoladora_salary_config";
const CACHE_LOCATIONS_KEY = "cocoladora_cached_locations";
const CACHE_PLACES_KEY = "cocoladora_cached_places";
const CACHE_MESSAGES_KEY = "cocoladora_cached_messages";

export const ApiService = {
  // --- Locations (Calculated sessions) ---
  async getLocations(): Promise<Location[]> {
    try {
      const res = await fetch("/api/locations");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          localStorage.setItem(CACHE_LOCATIONS_KEY, JSON.stringify(data));
          return data;
        }
      }
    } catch (err) {
      console.warn("Could not fetch locations from /api/locations:", err);
    }

    // Local cache fallback (no fake data)
    try {
      const cached = localStorage.getItem(CACHE_LOCATIONS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}

    return [];
  },

  async addLocation(location: Location): Promise<Location[]> {
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(location),
      });

      if (res.ok) {
        const saved = await res.json();
        const current = await this.getLocations();
        // Check if already in list
        const exists = current.some((l) => l.id && l.id === saved.id);
        const updated = exists ? current : [saved, ...current];
        localStorage.setItem(CACHE_LOCATIONS_KEY, JSON.stringify(updated));
        return updated;
      }
    } catch (err) {
      console.warn("Error posting to /api/locations:", err);
    }

    // Local fallback if offline or backend is configuring
    const current = await this.getLocations();
    const fallbackItem = { ...location, id: Date.now() };
    const updated = [fallbackItem, ...current];
    localStorage.setItem(CACHE_LOCATIONS_KEY, JSON.stringify(updated));
    return updated;
  },

  async removeLocation(id?: number | string, index?: number): Promise<Location[]> {
    try {
      if (id) {
        await fetch(`/api/locations?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
      }
    } catch (err) {
      console.warn("Error deleting location from /api/locations:", err);
    }

    const current = await this.getLocations();
    const updated = current.filter((loc, idx) => {
      if (id !== undefined && loc.id !== undefined) {
        return loc.id !== id;
      }
      return idx !== index;
    });
    localStorage.setItem(CACHE_LOCATIONS_KEY, JSON.stringify(updated));
    return updated;
  },

  async clearLocations(): Promise<Location[]> {
    try {
      await fetch("/api/locations", { method: "DELETE" });
    } catch (err) {
      console.warn("Error clearing /api/locations:", err);
    }
    localStorage.removeItem(CACHE_LOCATIONS_KEY);
    return [];
  },

  // --- Places (Restroom ratings) ---
  async getPlaces(): Promise<{ [key: string]: Place }> {
    try {
      const res = await fetch("/api/places");
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === "object") {
          localStorage.setItem(CACHE_PLACES_KEY, JSON.stringify(data));
          return data;
        }
      }
    } catch (err) {
      console.warn("Could not fetch places from /api/places:", err);
    }

    // Local cache fallback (no fake data)
    try {
      const cached = localStorage.getItem(CACHE_PLACES_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch {}

    return {};
  },

  async addPlace(place: Place): Promise<{ [key: string]: Place }> {
    try {
      const res = await fetch("/api/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(place),
      });

      if (res.ok) {
        const saved = await res.json();
        const current = await this.getPlaces();
        const updated = {
          ...current,
          [saved.id]: saved,
        };
        localStorage.setItem(CACHE_PLACES_KEY, JSON.stringify(updated));
        return updated;
      }
    } catch (err) {
      console.warn("Error posting to /api/places:", err);
    }

    // Local fallback
    const current = await this.getPlaces();
    const id = place.id || `place-${Date.now()}`;
    const updated = {
      ...current,
      [id]: { ...place, id },
    };
    localStorage.setItem(CACHE_PLACES_KEY, JSON.stringify(updated));
    return updated;
  },

  // --- Door Messages (Graffiti) ---
  async getDoorMessages(): Promise<DoorMessage[]> {
    try {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          localStorage.setItem(CACHE_MESSAGES_KEY, JSON.stringify(data));
          return data;
        }
      }
    } catch (err) {
      console.warn("Could not fetch messages from /api/messages:", err);
    }

    // Local cache fallback (no fake data)
    try {
      const cached = localStorage.getItem(CACHE_MESSAGES_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}

    return [];
  },

  async addDoorMessage(msg: Omit<DoorMessage, "id"> & { id?: string }): Promise<DoorMessage[]> {
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      });

      if (res.ok) {
        const saved = await res.json();
        const current = await this.getDoorMessages();
        const updated = [saved, ...current];
        localStorage.setItem(CACHE_MESSAGES_KEY, JSON.stringify(updated));
        return updated;
      }
    } catch (err) {
      console.warn("Error posting to /api/messages:", err);
    }

    // Local fallback
    const current = await this.getDoorMessages();
    const id = msg.id || `door-${Date.now()}`;
    const updated = [{ ...msg, id }, ...current];
    localStorage.setItem(CACHE_MESSAGES_KEY, JSON.stringify(updated));
    return updated;
  },

  // --- Salary Config (User device preference) ---
  getSalaryConfig(): SalaryConfig {
    try {
      const data = localStorage.getItem(SALARY_CONFIG_KEY);
      if (data) {
        return JSON.parse(data);
      }
      // Check legacy key
      const legacy = localStorage.getItem("salaryConfig");
      if (legacy) {
        return JSON.parse(legacy);
      }
    } catch {}

    return {
      periodicity: "monthly",
      hoursPerWeek: 44,
    };
  },

  saveSalaryConfig(config: SalaryConfig): void {
    try {
      localStorage.setItem(SALARY_CONFIG_KEY, JSON.stringify(config));
    } catch (err) {
      console.error("Error saving salary config:", err);
    }
  },
};
