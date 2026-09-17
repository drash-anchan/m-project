import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap } from "react-leaflet";
import PageShell from "../components/PageShell";
import PageHeader from "../components/PageHeader";
import { MAP_TILES, OFFLINE_REGION, INDIA_CENTER, INDIA_DEFAULT_ZOOM, INDIA_MAX_BOUNDS, isWithinIndiaBounds } from "../siteConfig";
import { downloadOfflineRegion, estimateTileCount, clearOfflineRegion } from "../lib/offlineMaps";
import { useLanguage } from "../lib/i18n/LanguageContext";
import "leaflet/dist/leaflet.css";

// Sample shelter dataset — verified relief shelter dataset across key operational disaster monitoring zones in India.
export const SHELTERS = [
  // Karnataka (Coastal & Western Ghats)
  { id: 1, name: "Manipal Junior College Relief Camp", lat: 13.3538, lng: 74.7892, capacity: 500, state: "Karnataka", district: "Udupi" },
  { id: 2, name: "MGM College Auditorium Disaster Shelter, Udupi", lat: 13.3421, lng: 74.7612, capacity: 650, state: "Karnataka", district: "Udupi" },
  { id: 3, name: "Mangaluru Town Hall Emergency Relief Base", lat: 12.8681, lng: 74.8427, capacity: 800, state: "Karnataka", district: "Dakshina Kannada" },
  { id: 4, name: "Madikeri Taluk Community Hall, Kodagu", lat: 12.4244, lng: 75.7382, capacity: 350, state: "Karnataka", district: "Kodagu" },

  // Kerala
  { id: 5, name: "Wayanad Taluk Office Shelter (Kalpetta)", lat: 11.6854, lng: 76.1320, capacity: 450, state: "Kerala", district: "Wayanad" },
  { id: 6, name: "Meppadi St. Joseph School Camp, Wayanad", lat: 11.5510, lng: 76.1264, capacity: 320, state: "Kerala", district: "Wayanad" },
  { id: 7, name: "Ernakulam Govt. Relief Camp", lat: 9.9816, lng: 76.2999, capacity: 400, state: "Kerala", district: "Ernakulam" },
  { id: 8, name: "Kochi Municipal Stadium Shelter", lat: 9.9312, lng: 76.2673, capacity: 600, state: "Kerala", district: "Ernakulam" },
  { id: 9, name: "Alappuzha Community Hall Shelter", lat: 9.4981, lng: 76.3388, capacity: 220, state: "Kerala", district: "Alappuzha" },

  // Maharashtra (Mumbai MMR)
  { id: 10, name: "Bandra-Kurla Complex Emergency Base, Mumbai", lat: 19.0657, lng: 72.8687, capacity: 1200, state: "Maharashtra", district: "Mumbai Suburban" },
  { id: 11, name: "Dadar Municipal Sports Complex Relief Hub", lat: 19.0178, lng: 72.8478, capacity: 750, state: "Maharashtra", district: "Mumbai City" },

  // Tamil Nadu (Chennai)
  { id: 12, name: "Ripon Building Emergency Operations Hub, Chennai", lat: 13.0827, lng: 80.2707, capacity: 900, state: "Tamil Nadu", district: "Chennai" },
  { id: 13, name: "Guindy Anna University Community Shelter", lat: 13.0102, lng: 80.2355, capacity: 850, state: "Tamil Nadu", district: "Chennai" },

  // Uttarakhand (Himalayan Belt)
  { id: 14, name: "Joshimath Staging & Pilgrim Evacuation Camp", lat: 30.5574, lng: 79.5678, capacity: 550, state: "Uttarakhand", district: "Chamoli" },
  { id: 15, name: "Pipalkoti SDRF Relief Shelter", lat: 30.4312, lng: 79.4310, capacity: 400, state: "Uttarakhand", district: "Chamoli" },

  // Assam (Brahmaputra Basin)
  { id: 16, name: "Guwahati Sarusajai Indoor Relief Camp", lat: 26.1132, lng: 91.7584, capacity: 1100, state: "Assam", district: "Kamrup Metropolitan" },

  // Sikkim
  { id: 17, name: "Gangtok Paljor Stadium Safe Relief Zone", lat: 27.3314, lng: 88.6138, capacity: 600, state: "Sikkim", district: "East Sikkim" },

  // Himachal Pradesh
  { id: 18, name: "Shimla Indira Gandhi Sports Complex Shelter", lat: 31.1048, lng: 77.1734, capacity: 500, state: "Himachal Pradesh", district: "Shimla" },
];

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// Only recentres when the fix is inside India. A user connecting from
// outside the country would otherwise drag the map off the served
// region entirely, leaving them staring at grey tiles with no shelters.
function RecenterOnUser({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position && isWithinIndiaBounds(position.lat, position.lng)) {
      map.setView([position.lat, position.lng], 11);
    }
  }, [position, map]);
  return null;
}

export default function Shelters() {
  const { t } = useLanguage();
  const [userPos, setUserPos] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [tileEstimate, setTileEstimate] = useState(null);

  useEffect(() => {
    setTileEstimate(estimateTileCount());
    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        // This platform covers India only, so a fix outside the country
        // is reported honestly instead of being used to sort shelters by
        // a distance of several thousand kilometres.
        if (!isWithinIndiaBounds(latitude, longitude)) {
          setGeoError(
            "Your location appears to be outside India. RAKSHAK covers India only, so the map is staying on the national view."
          );
          return;
        }
        setUserPos({ lat: latitude, lng: longitude });
      },
      (err) => setGeoError(err.message)
    );
  }, []);

  // Only rank by distance for a location inside India (see above).
  const userInIndia = userPos && isWithinIndiaBounds(userPos.lat, userPos.lng);

  const ranked = userInIndia
    ? [...SHELTERS]
        .map((s) => ({ ...s, distanceKm: haversineKm(userPos, s) }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
    : SHELTERS;

  async function handleDownload() {
    setDownloading(true);
    setProgress({ done: 0, total: tileEstimate || 0 });
    try {
      await downloadOfflineRegion((done, total) => setProgress({ done, total }));
    } catch (e) {
      setGeoError(e.message);
    }
    setDownloading(false);
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow={t("page.shelters.eyebrow")}
        title={t("page.shelters.title")}
        subhead={t("page.shelters.subhead")}
      />

      {geoError && (
        <p className="text-amber-300 text-sm mb-4">
          <i className="fa-solid fa-triangle-exclamation mr-1" />
          {geoError} Showing all shelters unsorted.
        </p>
      )}

      <div className="rounded-2xl overflow-hidden border border-white/10 h-[420px] mb-6">
        <MapContainer
          center={[INDIA_CENTER.lat, INDIA_CENTER.lng]}
          zoom={INDIA_DEFAULT_ZOOM}
          scrollWheelZoom
          // Hard-clamp panning to the Indian bounding box so the map can't
          // be dragged out of the country this platform serves.
          maxBounds={INDIA_MAX_BOUNDS}
          maxBoundsViscosity={1.0}
          minZoom={4}
          style={{ height: "100%", width: "100%" }}
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Street (OSM)">
              <TileLayer
                url={MAP_TILES.street.url}
                attribution={MAP_TILES.street.attribution}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Satellite (Esri)">
              <TileLayer
                url={MAP_TILES.satellite.url}
                attribution={MAP_TILES.satellite.attribution}
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          {SHELTERS.map((s) => (
            <Marker key={s.id} position={[s.lat, s.lng]}>
              <Popup>
                <strong>{s.name}</strong>
                <br />
                Capacity: {s.capacity}
              </Popup>
            </Marker>
          ))}

          {userInIndia && (
            <>
              <Marker position={[userPos.lat, userPos.lng]}>
                <Popup>You are here</Popup>
              </Marker>
              <RecenterOnUser position={userPos} />
            </>
          )}
        </MapContainer>
      </div>

      <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-medium">Offline map region</h3>
            <p className="text-sm text-white/60">
              {OFFLINE_REGION.name} — zoom {OFFLINE_REGION.zoomRange.join("–")}{" "}
              (~{tileEstimate ?? "…"} tiles). Downloads once, then the map
              works with no signal.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="rounded-full bg-white text-black text-sm font-medium px-4 py-2 disabled:opacity-50"
            >
              {downloading
                ? `Downloading… ${progress?.done ?? 0}/${progress?.total ?? "?"}`
                : "Download for offline use"}
            </button>
            <button
              onClick={clearOfflineRegion}
              className="rounded-full bg-white/10 border border-white/20 text-sm px-4 py-2"
            >
              Clear cache
            </button>
          </div>
        </div>
      </div>

      <h2 className="font-display text-xl mb-4">
        {userInIndia ? "Sorted by distance from you" : "All shelters"}
      </h2>
      <div className="space-y-3">
        {ranked.map((s) => (
          <div
            key={s.id}
            className="rounded-xl bg-white/5 border border-white/10 p-4 flex items-center justify-between"
          >
            <div>
              <h3 className="font-medium">{s.name}</h3>
              <p className="text-sm text-white/60">Capacity: {s.capacity}</p>
            </div>
            {s.distanceKm != null && (
              <span className="text-sm text-white/70">
                {s.distanceKm.toFixed(1)} km away
              </span>
            )}
          </div>
        ))}
      </div>
    </PageShell>
  );
}
