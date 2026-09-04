import { Location } from "../entities/Location";
import { Place } from "../entities/Place";
import { DoorMessage } from "../entities/DoorMessage";
import { SalaryConfig } from "../entities/SalaryConfig";

const SALARY_CONFIG_KEY = "cocoladora_salary_config";
const CACHE_LOCATIONS_KEY = "cocoladora_cached_locations";
const CACHE_PLACES_KEY = "cocoladora_cached_places";
const CACHE_MESSAGES_KEY = "cocoladora_cached_messages";
const CACHE_FETCHED_AT_KEY = "cocoladora_cache_fetched_at";

const LEGACY_LOCATION_KEYS = ["locations", "cocoladora_locations_v2", CACHE_LOCATIONS_KEY];
const LEGACY_PLACES_KEYS = ["places", "cocoladora_places_v2", CACHE_PLACES_KEY];
const LEGACY_MESSAGE_KEYS = ["doorMessages", "cocoladora_door_messages_v2", CACHE_MESSAGES_KEY];

const CLIENT_TTL_MS = 5 * 60 * 1000;

export type BootstrapData = {
  locations: Location[];
  places: { [key: string]: Place };
  messages: DoorMessage[];
};

type MemoryCache = BootstrapData & { fetchedAt: number };

let memory: MemoryCache | null = null;
let inflight: Promise<BootstrapData> | null = null;

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

function parseJsonArray<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject<T>(raw: string | null): { [key: string]: T } {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function readLegacyLocations(): Location[] {
  const localRecords: Location[] = [];
  for (const key of LEGACY_LOCATION_KEYS) {
    try {
      localRecords.push(...parseJsonArray<Location>(localStorage.getItem(key)));
    } catch {}
  }
  return localRecords;
}

function readLegacyPlaces(): { [key: string]: Place } {
  const localPlaces: { [key: string]: Place } = {};
  for (const key of LEGACY_PLACES_KEYS) {
    try {
      Object.assign(localPlaces, parseJsonObject<Place>(localStorage.getItem(key)));
    } catch {}
  }
  return localPlaces;
}

function readLegacyMessages(): DoorMessage[] {
  const localMessages: DoorMessage[] = [];
  for (const key of LEGACY_MESSAGE_KEYS) {
    try {
      localMessages.push(...parseJsonArray<DoorMessage>(localStorage.getItem(key)));
    } catch {}
  }
  return localMessages;
}

function persist(cache: MemoryCache) {
  memory = cache;
  try {
    localStorage.setItem(CACHE_LOCATIONS_KEY, JSON.stringify(cache.locations));
    localStorage.setItem(CACHE_PLACES_KEY, JSON.stringify(cache.places));
    localStorage.setItem(CACHE_MESSAGES_KEY, JSON.stringify(cache.messages));
    localStorage.setItem(CACHE_FETCHED_AT_KEY, String(cache.fetchedAt));
  } catch {}
}

function readStoredCache(): MemoryCache | null {
  try {
    const fetchedAt = Number(localStorage.getItem(CACHE_FETCHED_AT_KEY) || 0);
    const locations = parseJsonArray<Location>(localStorage.getItem(CACHE_LOCATIONS_KEY));
    const places = parseJsonObject<Place>(localStorage.getItem(CACHE_PLACES_KEY));
    const messages = parseJsonArray<DoorMessage>(localStorage.getItem(CACHE_MESSAGES_KEY));
    if (!fetchedAt && locations.length === 0 && Object.keys(places).length === 0 && messages.length === 0) {
      return null;
    }
    return { locations, places, messages, fetchedAt };
  } catch {
    return null;
  }
}

function getMemoryOrStore(): MemoryCache {
  if (memory) return memory;
  const stored = readStoredCache();
  if (stored) {
    memory = stored;
    return stored;
  }
  return { locations: [], places: {}, messages: [], fetchedAt: 0 };
}

function isFresh(cache: MemoryCache | null): cache is MemoryCache {
  return !!cache && Date.now() - cache.fetchedAt < CLIENT_TTL_MS;
}

async function parseResponse(res: Response): Promise<any | null> {
  if (!res.ok) return null;
  const text = await res.text();
  if (!text || (!text.startsWith("{") && !text.startsWith("["))) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function mergeLocations(remote: Location[], local: Location[]): Location[] {
  const combined = [...remote];
  for (const loc of local) {
    if (!combined.some((c) => areLocationsEqual(c, loc))) combined.push(loc);
  }
  return combined;
}

function mergeMessages(remote: DoorMessage[], local: DoorMessage[]): DoorMessage[] {
  const combined = [...remote];
  for (const msg of local) {
    const exists = combined.some(
      (c) => (c.id && msg.id && c.id === msg.id) || c.message === msg.message
    );
    if (!exists) combined.push(msg);
  }
  return combined;
}

export const ApiService = {
  async getBootstrap(): Promise<BootstrapData> {
    if (isFresh(memory)) {
      return memory;
    }

    const stored = readStoredCache();
    if (isFresh(stored)) {
      memory = stored;
      return stored;
    }

    if (inflight) return inflight;

    inflight = (async () => {
      try {
        const res = await fetch("/api/bootstrap");
        const data = await parseResponse(res);

        let locations: Location[] = [];
        let places: { [key: string]: Place } = {};
        let messages: DoorMessage[] = [];

        if (data && typeof data === "object" && Array.isArray(data.locations)) {
          locations = mergeLocations(data.locations, readLegacyLocations());
          places = { ...readLegacyPlaces(), ...(data.places || {}) };
          messages = mergeMessages(
            Array.isArray(data.messages) ? data.messages : [],
            readLegacyMessages()
          );
        } else {
          // Fallback if bootstrap is unavailable (older deploy)
          const [locRes, placeRes, msgRes] = await Promise.all([
            fetch("/api/locations").then(parseResponse).catch(() => null),
            fetch("/api/places").then(parseResponse).catch(() => null),
            fetch("/api/messages").then(parseResponse).catch(() => null),
          ]);
          locations = mergeLocations(
            Array.isArray(locRes) ? locRes : [],
            readLegacyLocations()
          );
          places = {
            ...readLegacyPlaces(),
            ...(placeRes && typeof placeRes === "object" ? placeRes : {}),
          };
          messages = mergeMessages(
            Array.isArray(msgRes) ? msgRes : [],
            readLegacyMessages()
          );
        }

        const next: MemoryCache = {
          locations,
          places,
          messages,
          fetchedAt: Date.now(),
        };
        persist(next);
        return next;
      } catch (err) {
        console.warn("Could not fetch bootstrap data:", err);
        const fallback = stored || getMemoryOrStore();
        return {
          locations: fallback.locations,
          places: fallback.places,
          messages: fallback.messages,
        };
      } finally {
        inflight = null;
      }
    })();

    return inflight;
  },

  async getLocations(): Promise<Location[]> {
    const data = await this.getBootstrap();
    return data.locations;
  },

  async addLocation(location: Location): Promise<Location[]> {
    let savedRecord: Location = { ...location, id: Date.now() };

    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(location),
      });
      const saved = await parseResponse(res);
      if (saved && typeof saved === "object") savedRecord = saved;
    } catch (err) {
      console.warn("Error posting to /api/locations:", err);
    }

    const current = getMemoryOrStore();
    const exists = current.locations.some((l) => areLocationsEqual(l, savedRecord));
    const locations = exists ? current.locations : [savedRecord, ...current.locations];
    persist({ ...current, locations });
    return locations;
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

    const current = getMemoryOrStore();
    const locations = current.locations.filter((loc, idx) => {
      if (id !== undefined && loc.id !== undefined) {
        return String(loc.id) !== String(id);
      }
      return idx !== index;
    });
    persist({ ...current, locations });
    try {
      localStorage.setItem("locations", JSON.stringify(locations));
    } catch {}
    return locations;
  },

  async clearLocations(): Promise<Location[]> {
    for (const key of LEGACY_LOCATION_KEYS) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }
    const current = getMemoryOrStore();
    persist({ ...current, locations: [] });
    return [];
  },

  async getPlaces(): Promise<{ [key: string]: Place }> {
    const data = await this.getBootstrap();
    return data.places;
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
      const saved = await parseResponse(res);
      if (saved && typeof saved === "object") savedRecord = saved;
    } catch (err) {
      console.warn("Error posting to /api/places:", err);
    }

    const current = getMemoryOrStore();
    const places = {
      ...current.places,
      [savedRecord.id || id]: savedRecord,
    };
    persist({ ...current, places });
    return places;
  },

  async getDoorMessages(): Promise<DoorMessage[]> {
    const data = await this.getBootstrap();
    return data.messages;
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
      const saved = await parseResponse(res);
      if (saved && typeof saved === "object") savedMsg = saved;
    } catch (err) {
      console.warn("Error posting to /api/messages:", err);
    }

    const current = getMemoryOrStore();
    const messages = [savedMsg, ...current.messages];
    persist({ ...current, messages });
    return messages;
  },

  getSalaryConfig(): SalaryConfig {
    try {
      const data = localStorage.getItem(SALARY_CONFIG_KEY);
      if (data) return JSON.parse(data);
      const legacy = localStorage.getItem("salaryConfig");
      if (legacy) return JSON.parse(legacy);
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
