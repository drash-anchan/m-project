// Pre-downloads OSM tiles for a bounding box so the map keeps working
// with zero signal. Real technique: standard slippy-map tile math +
// Cache API. Storage is finite on-device, so we deliberately cap the
// zoom range in siteConfig.OFFLINE_REGION rather than caching "everything".

import { MAP_TILES, OFFLINE_REGION } from "../siteConfig";

const TILE_CACHE_NAME = "map-tiles-v1";

function lonToTileX(lon, zoom) {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}
function latToTileY(lat, zoom) {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, zoom)
  );
}

function tilesForRegion(bounds, zoom) {
  const xMin = lonToTileX(bounds.west, zoom);
  const xMax = lonToTileX(bounds.east, zoom);
  const yMin = latToTileY(bounds.north, zoom);
  const yMax = latToTileY(bounds.south, zoom);
  const tiles = [];
  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMin; y <= yMax; y++) {
      tiles.push({ x, y, z: zoom });
    }
  }
  return tiles;
}

export function estimateTileCount(
  bounds = OFFLINE_REGION.bounds,
  zoomRange = OFFLINE_REGION.zoomRange
) {
  let count = 0;
  for (let z = zoomRange[0]; z <= zoomRange[1]; z++) {
    count += tilesForRegion(bounds, z).length;
  }
  return count;
}

// onProgress(done, total) called as tiles land. Skips ones already cached.
export async function downloadOfflineRegion(onProgress) {
  if (!("caches" in window)) {
    throw new Error("Cache API not supported in this browser.");
  }
  const cache = await caches.open(TILE_CACHE_NAME);
  const { bounds, zoomRange } = OFFLINE_REGION;

  let allTiles = [];
  for (let z = zoomRange[0]; z <= zoomRange[1]; z++) {
    allTiles = allTiles.concat(tilesForRegion(bounds, z));
  }

  let done = 0;
  const subdomains = ["a", "b", "c"];
  for (const t of allTiles) {
    const s = subdomains[(t.x + t.y) % subdomains.length];
    const url = MAP_TILES.street.url
      .replace("{s}", s)
      .replace("{z}", t.z)
      .replace("{x}", t.x)
      .replace("{y}", t.y);
    const alreadyCached = await cache.match(url);
    if (!alreadyCached) {
      try {
        const res = await fetch(url, { mode: "cors" });
        if (res.ok) await cache.put(url, res.clone());
      } catch {
        // offline or blocked — skip, keep going
      }
    }
    done++;
    onProgress?.(done, allTiles.length);
  }
  return { total: allTiles.length };
}

export async function clearOfflineRegion() {
  if ("caches" in window) await caches.delete(TILE_CACHE_NAME);
}

export async function offlineRegionSizeEstimate() {
  if (!("storage" in navigator) || !navigator.storage.estimate) return null;
  return navigator.storage.estimate();
}
