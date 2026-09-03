export interface AutocompletePlace {
  id: string;
  name: string;
  city: string;
  state?: string;
  country?: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  type?: string;
}

interface SearchOptions {
  lat?: number;
  lng?: number;
  limit?: number;
  signal?: AbortSignal;
}

// In-memory cache for fast snappy backspacing/re-typing
const searchCache = new Map<string, AutocompletePlace[]>();

export async function searchPlaces(
  query: string,
  options: SearchOptions = {}
): Promise<AutocompletePlace[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const limit = options.limit || 5;
  const cacheKey = `${trimmed.toLowerCase()}_${options.lat?.toFixed(2) || ""}_${options.lng?.toFixed(2) || ""}_${limit}`;

  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }

  // 1. Primary: Photon API (Fast, free OpenStreetMap-based autocomplete search)
  try {
    let photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=${limit}`;
    if (options.lat !== undefined && options.lng !== undefined) {
      photonUrl += `&lat=${options.lat}&lon=${options.lng}`;
    }

    const res = await fetch(photonUrl, {
      signal: options.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.features) && data.features.length > 0) {
        const results: AutocompletePlace[] = data.features.map(
          (feat: any, idx: number) => {
            const props = feat.properties || {};
            const coords = feat.geometry?.coordinates || [0, 0];

            // Build best human-readable name
            const name =
              props.name ||
              props.street ||
              props.district ||
              props.city ||
              trimmed;

            const city = props.city || props.district || props.locality || "";
            const state = props.state || "";
            const country = props.country || "";

            // Build detailed address line
            const addressParts: string[] = [];
            if (props.street) {
              const streetLine = props.housenumber
                ? `${props.street}, ${props.housenumber}`
                : props.street;
              if (streetLine !== name) addressParts.push(streetLine);
            }
            if (props.district && props.district !== name && props.district !== city) {
              addressParts.push(props.district);
            }
            if (city && city !== name) addressParts.push(city);
            if (state) addressParts.push(state);
            if (country && country !== name) addressParts.push(country);

            const fullAddress =
              addressParts.length > 0 ? addressParts.join(" • ") : name;

            return {
              id: `photon-${props.osm_type || "w"}-${props.osm_id || idx}-${Date.now()}`,
              name,
              city: city || (state ? `${state}, ${country}` : country),
              state,
              country,
              fullAddress,
              latitude: Number(coords[1]),
              longitude: Number(coords[0]),
              type: props.osm_value || props.type,
            };
          }
        );

        searchCache.set(cacheKey, results);
        return results;
      }
    }
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw err;
    }
    console.warn("Photon autocomplete failed, trying Nominatim fallback:", err);
  }

  // 2. Secondary Fallback: OpenStreetMap Nominatim (Standard geocoder)
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      trimmed
    )}&format=json&limit=${limit}&addressdetails=1`;

    const res = await fetch(nominatimUrl, {
      signal: options.signal,
      headers: {
        "User-Agent": "Cocoladora/1.0 (https://cocoladora.com)",
        Accept: "application/json",
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const results: AutocompletePlace[] = data.map((item: any, idx: number) => {
          const addr = item.address || {};
          const name =
            item.name ||
            addr.amenity ||
            addr.shop ||
            addr.building ||
            (item.display_name ? item.display_name.split(",")[0] : trimmed);

          const city =
            addr.city ||
            addr.town ||
            addr.municipality ||
            addr.suburb ||
            addr.village ||
            "";
          const state = addr.state || "";
          const country = addr.country || "";

          const parts: string[] = [];
          if (addr.road && addr.road !== name) parts.push(addr.road);
          if (addr.suburb && addr.suburb !== city) parts.push(addr.suburb);
          if (city) parts.push(city);
          if (state) parts.push(state);
          if (country) parts.push(country);

          const fullAddress = parts.length > 0 ? parts.join(" • ") : item.display_name || name;

          return {
            id: `nominatim-${item.place_id || idx}`,
            name,
            city: city || state || country,
            state,
            country,
            fullAddress,
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            type: item.type,
          };
        });

        searchCache.set(cacheKey, results);
        return results;
      }
    }
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw err;
    }
    console.warn("Nominatim fallback also failed:", err);
  }

  return [];
}
