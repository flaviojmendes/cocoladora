export type ClusterItem<T> = {
  lat: number;
  lng: number;
  data: T;
};

export type Cluster<T> = {
  id: string;
  lat: number;
  lng: number;
  count: number;
  items: ClusterItem<T>[];
};

export type MapBounds = {
  south: number;
  north: number;
  west: number;
  east: number;
};

/** Grid cell size in degrees — coarser at low zoom, finer as the user zooms in. */
export function cellSizeDegrees(zoom: number): number {
  if (zoom <= 3) return 12;
  if (zoom <= 5) return 4;
  if (zoom <= 7) return 1.2;
  if (zoom <= 9) return 0.35;
  if (zoom <= 11) return 0.08;
  if (zoom <= 13) return 0.02;
  if (zoom <= 15) return 0.005;
  return 0.001;
}

function bucket<T>(items: ClusterItem<T>[], cell: number): Cluster<T>[] {
  const buckets = new Map<string, ClusterItem<T>[]>();

  for (const item of items) {
    const gx = Math.round(item.lat / cell);
    const gy = Math.round(item.lng / cell);
    const key = `${gx}:${gy}`;
    const group = buckets.get(key);
    if (group) group.push(item);
    else buckets.set(key, [item]);
  }

  const clusters: Cluster<T>[] = [];
  buckets.forEach((group, key) => {
    let lat = 0;
    let lng = 0;
    for (const g of group) {
      lat += g.lat;
      lng += g.lng;
    }
    const n = group.length;
    clusters.push({
      id: key,
      lat: lat / n,
      lng: lng / n,
      count: n,
      items: group,
    });
  });

  return clusters;
}

const MAX_VISIBLE = 70;

/**
 * Viewport-cull then grid-cluster points. Caps DOM markers so the map stays
 * interactive with hundreds of records. Visibility is kept via cluster counts.
 */
export function clusterInView<T>(
  items: ClusterItem<T>[],
  zoom: number,
  bounds: MapBounds | null,
  padRatio = 0.3
): Cluster<T>[] {
  let filtered = items;

  if (bounds) {
    const latPad = Math.max((bounds.north - bounds.south) * padRatio, 0.01);
    const lngPad = Math.max((bounds.east - bounds.west) * padRatio, 0.01);
    const south = bounds.south - latPad;
    const north = bounds.north + latPad;
    const west = bounds.west - lngPad;
    const east = bounds.east + lngPad;
    filtered = items.filter(
      (p) => p.lat >= south && p.lat <= north && p.lng >= west && p.lng <= east
    );
  }

  let cell = cellSizeDegrees(zoom);
  let clusters = bucket(filtered, cell);

  while (clusters.length > MAX_VISIBLE && cell < 24) {
    cell *= 1.8;
    clusters = bucket(filtered, cell);
  }

  return clusters;
}
