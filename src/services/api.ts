import { Location } from "../entities/Location";
import { Place } from "../entities/Place";
import { DoorMessage } from "../entities/DoorMessage";
import { SalaryConfig } from "../entities/SalaryConfig";

const SALARY_CONFIG_KEY = "cocoladora_salary_config";
const CACHE_LOCATIONS_KEY = "cocoladora_cached_locations";
const CACHE_PLACES_KEY = "cocoladora_cached_places";
const CACHE_MESSAGES_KEY = "cocoladora_cached_messages";

// Legacy keys for seamless migration of existing user data
const LEGACY_LOCATION_KEYS = ["locations", "cocoladora_locations_v2", CACHE_LOCATIONS_KEY];
const LEGACY_PLACES_KEYS = ["places", "cocoladora_places_v2", CACHE_PLACES_KEY];
const LEGACY_MESSAGE_KEYS = ["doorMessages", "cocoladora_door_messages_v2", CACHE_MESSAGES_KEY];

function areLocationsEqual(a: Location, b: Location): boolean {
  if (a.id !== undefined && b.id !== undefined && String(a.id) === String(b.id)) {
    return true;
  }
  return (
    a.day === b.day &&
    a.timestarted === b.timestarted &&
    a.timeended === b.timeended &&
    a.totalearned === b.totalearned &&
    Math.abs(Number(a.latitude) - Number(b.latitude)) < 0.0001 &&
    Math.abs(Number(a.longitude) - Number(b.longitude)) < 0.0001
  );
}

export const ApiService = {
  // --- Locations (Calculated sessions) ---
  async getLocations(): Promise<Location[]> {
    let remoteData: Location[] | null = null;
    try {
      const res = await fetch("/api/locations");
      if (res.ok) {
        const text = await res.text();
        // Check if response is valid JSON (avoid HTML fallback from Vite/SPA)
        if (text && (text.startsWith("[") || text.startsWith("{"))) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            remoteData = parsed;
          }
        }
      }
    } catch (err) {
      console.warn("Could not fetch locations from /api/locations:", err);
    }

    // Collect all local records across current and legacy keys
    const localRecords: Location[] = [];
    for (const key of LEGACY_LOCATION_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            localRecords.push(...parsed);
          }
        }
      } catch {}
    }

    // If we have remote data, merge with any local records not yet present on remote
    if (remoteData) {
      const combined = [...remoteData];
      for (const loc of localRecords) {
        const exists = combined.some((c) => areLocationsEqual(c, loc));
        if (!exists) {
          combined.push(loc);
        }
      }
      try {
        localStorage.setItem(CACHE_LOCATIONS_KEY, JSON.stringify(combined));
      } catch {}
      return combined;
    }

    // Fallback: Return deduplicated local records
    if (localRecords.length > 0) {
      const unique: Location[] = [];
      for (const loc of localRecords) {
        const exists = unique.some((u) => areLocationsEqual(u, loc));
        if (!exists) unique.push(loc);
      }
      return unique;
    }

    return [];
  },

  async addLocation(location: Location): Promise<Location[]> {
    let savedRecord: Location = { ...location, id: Date.now() };

    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(location),
      });

      if (res.ok) {
        const text = await res.text();
        if (text && (text.startsWith("{") || text.startsWith("["))) {
          const saved = JSON.parse(text);
          if (saved && typeof saved === "object") {
            savedRecord = saved;
          }
        }
      }
    } catch (err) {
      console.warn("Error posting to /api/locations:", err);
    }

    const current = await this.getLocations();
    const exists = current.some((l) => areLocationsEqual(l, savedRecord));
    const updated = exists ? current : [savedRecord, ...current];
    try {
      localStorage.setItem(CACHE_LOCATIONS_KEY, JSON.stringify(updated));
    } catch {}
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
        return String(loc.id) !== String(id);
      }
      return idx !== index;
    });

    try {
      localStorage.setItem(CACHE_LOCATIONS_KEY, JSON.stringify(updated));
      localStorage.setItem("locations", JSON.stringify(updated));
    } catch {}
    return updated;
  },

  async clearLocations(): Promise<Location[]> {
    // Only clears user's local paycheck history on this device
    // Never wipes the global community database!
    for (const key of LEGACY_LOCATION_KEYS) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }
    return [];
  },

  // --- Places (Restroom ratings) ---
  async getPlaces(): Promise<{ [key: string]: Place }> {
    let remotePlaces: { [key: string]: Place } | null = null;
    try {
      const res = await fetch("/api/places");
      if (res.ok) {
        const text = await res.text();
        if (text && text.startsWith("{")) {
          const data = JSON.parse(text);
          if (data && typeof data === "object") {
            remotePlaces = data;
          }
        }
      }
    } catch (err) {
      console.warn("Could not fetch places from /api/places:", err);
    }

    const localPlaces: { [key: string]: Place } = {};
    for (const key of LEGACY_PLACES_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            Object.assign(localPlaces, parsed);
          }
        }
      } catch {}
    }

    if (remotePlaces) {
      const combined = { ...localPlaces, ...remotePlaces };
      try {
        localStorage.setItem(CACHE_PLACES_KEY, JSON.stringify(combined));
      } catch {}
      return combined;
    }

    return localPlaces;
  },

  async addPlace(place: Place): Promise<{ [key: string]: Place }> {
    const id = place.id || `place-${Date.now()}`;
    let savedRecord: Place = { ...place, id };

    try {
      const res = await fetch("/api/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(place),
      });

      if (res.ok) {
        const text = await res.text();
        if (text && text.startsWith("{")) {
          const saved = JSON.parse(text);
          if (saved && typeof saved === "object") {
            savedRecord = saved;
          }
        }
      }
    } catch (err) {
      console.warn("Error posting to /api/places:", err);
    }

    const current = await this.getPlaces();
    const updated = {
      ...current,
      [savedRecord.id || id]: savedRecord,
    };
    try {
      localStorage.setItem(CACHE_PLACES_KEY, JSON.stringify(updated));
    } catch {}
    return updated;
  },

  // --- Door Messages (Graffiti) ---
  async getDoorMessages(): Promise<DoorMessage[]> {
    let remoteMessages: DoorMessage[] | null = null;
    try {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const text = await res.text();
        if (text && (text.startsWith("[") || text.startsWith("{"))) {
          const data = JSON.parse(text);
          if (Array.isArray(data)) {
            remoteMessages = data;
          }
        }
      }
    } catch (err) {
      console.warn("Could not fetch messages from /api/messages:", err);
    }

    const localMessages: DoorMessage[] = [];
    for (const key of LEGACY_MESSAGE_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            localMessages.push(...parsed);
          }
        }
      } catch {}
    }

    if (remoteMessages) {
      const combined = [...remoteMessages];
      for (const msg of localMessages) {
        const exists = combined.some(
          (c) => (c.id && msg.id && c.id === msg.id) || (c.message === msg.message)
        );
        if (!exists) {
          combined.push(msg);
        }
      }
      try {
        localStorage.setItem(CACHE_MESSAGES_KEY, JSON.stringify(combined));
      } catch {}
      return combined;
    }

    if (localMessages.length > 0) {
      const unique: DoorMessage[] = [];
      for (const msg of localMessages) {
        const exists = unique.some(
          (u) => (u.id && msg.id && u.id === msg.id) || (u.message === msg.message)
        );
        if (!exists) unique.push(msg);
      }
      return unique;
    }

    return [];
  },

  async addDoorMessage(msg: Omit<DoorMessage, "id"> & { id?: string }): Promise<DoorMessage[]> {
    const id = msg.id || `door-${Date.now()}`;
    let savedMsg: DoorMessage = { ...msg, id };

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      });

      if (res.ok) {
        const text = await res.text();
        if (text && text.startsWith("{")) {
          const saved = JSON.parse(text);
          if (saved && typeof saved === "object") {
            savedMsg = saved;
          }
        }
      }
    } catch (err) {
      console.warn("Error posting to /api/messages:", err);
    }

    const current = await this.getDoorMessages();
    const updated = [savedMsg, ...current];
    try {
      localStorage.setItem(CACHE_MESSAGES_KEY, JSON.stringify(updated));
    } catch {}
    return updated;
  },

  // --- Salary Config (User device preference) ---
  getSalaryConfig(): SalaryConfig {
    try {
      const data = localStorage.getItem(SALARY_CONFIG_KEY);
      if (data) {
        return JSON.parse(data);
      }
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
