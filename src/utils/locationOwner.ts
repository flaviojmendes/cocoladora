const LOCATION_OWNER_TOKEN_KEY = "cocoladora_location_owner";
const MY_LOCATION_IDS_KEY = "cocoladora_my_location_ids";

export function getLocationOwnerToken(): string {
  try {
    const existing = localStorage.getItem(LOCATION_OWNER_TOKEN_KEY);
    if (existing) return existing;
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(LOCATION_OWNER_TOKEN_KEY, token);
    return token;
  } catch {
    return `loc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function readMyLocationIds(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(MY_LOCATION_IDS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function writeMyLocationIds(ids: Array<number | string>) {
  try {
    const unique = [...new Set(ids.map(String).filter(Boolean))];
    localStorage.setItem(MY_LOCATION_IDS_KEY, JSON.stringify(unique));
  } catch {}
}

export function rememberMyLocationId(id?: number | string) {
  if (id === undefined || id === null || id === "") return;
  writeMyLocationIds([...readMyLocationIds(), id]);
}

export function forgetMyLocationId(id?: number | string) {
  if (id === undefined || id === null || id === "") return;
  writeMyLocationIds(readMyLocationIds().filter((item) => item !== String(id)));
}

export function clearMyLocationIds() {
  writeMyLocationIds([]);
}

export function isMyLocationId(id?: number | string): boolean {
  if (id === undefined || id === null || id === "") return false;
  return readMyLocationIds().includes(String(id));
}
