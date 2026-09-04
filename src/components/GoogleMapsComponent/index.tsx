import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Place } from "../../entities/Place";
import "leaflet/dist/leaflet.css";
import { Modal } from "../Modal";
import { Location } from "../../entities/Location";
import {
  FaCheckSquare,
  FaMapMarkedAlt,
  FaRegSquare,
  FaToiletPaper,
  FaMapMarkerAlt,
  FaSearchPlus,
} from "react-icons/fa";
import { translate } from "../../languages/translator";
import { PlaceAutocomplete } from "../PlaceAutocomplete";
import { AutocompletePlace } from "../../services/geocoding";
import { AudioService } from "../../utils/audio";
import { clusterInView, MapBounds } from "../../utils/mapClusters";

const containerStyle = {
  width: "100%",
  height: "560px",
  zIndex: 1,
};

const ratedIcon = new L.Icon({
  iconUrl: "/sam.webp",
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
  className: "drop-shadow-md",
});

const poopIcon = new L.Icon({
  iconUrl: "/caco.webp",
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
  className: "drop-shadow-md",
});

const clusterIconCache = new Map<string, L.DivIcon>();

function getClusterIcon(count: number, kind: "poop" | "rated"): L.DivIcon {
  const size = count > 99 ? 48 : count > 20 ? 42 : 36;
  const key = `${kind}-${count}-${size}`;
  const cached = clusterIconCache.get(key);
  if (cached) return cached;

  const icon = L.divIcon({
    html: `<div class="cluster-pin cluster-${kind}" style="width:${size}px;height:${size}px">${count}</div>`,
    className: "cocoladora-cluster",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  clusterIconCache.set(key, icon);
  return icon;
}

function SetViewOnce({ coords }: { coords: { lat: number; lng: number } | null }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (!coords || done.current) return;
    done.current = true;
    map.setView(coords, Math.max(map.getZoom(), 10));
  }, [coords, map]);
  return null;
}

function MapPanController({
  targetCoords,
  zoom,
}: {
  targetCoords: { lat: number; lng: number } | null;
  zoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (targetCoords) {
      map.flyTo([targetCoords.lat, targetCoords.lng], zoom || 14, {
        duration: 1.2,
      });
    }
  }, [targetCoords, zoom, map]);
  return null;
}

type JitteredLocation = Location & { displayLat: number; displayLng: number };

function ClusteredLayers({
  locations,
  places,
  showCalculated,
  showRated,
  onSelectLocation,
  onSelectPlace,
}: {
  locations: JitteredLocation[];
  places: Place[];
  showCalculated: boolean;
  showRated: boolean;
  onSelectLocation: (loc: Location, siblings?: Location[]) => void;
  onSelectPlace: (place: Place, siblings?: Place[]) => void;
}) {
  const map = useMap();
  const [view, setView] = useState<{ zoom: number; bounds: MapBounds }>(() => {
    const b = map.getBounds();
    return {
      zoom: map.getZoom(),
      bounds: {
        south: b.getSouth(),
        north: b.getNorth(),
        west: b.getWest(),
        east: b.getEast(),
      },
    };
  });

  useEffect(() => {
    const update = () => {
      const b = map.getBounds();
      setView({
        zoom: map.getZoom(),
        bounds: {
          south: b.getSouth(),
          north: b.getNorth(),
          west: b.getWest(),
          east: b.getEast(),
        },
      });
    };
    map.on("moveend", update);
    map.on("zoomend", update);
    return () => {
      map.off("moveend", update);
      map.off("zoomend", update);
    };
  }, [map]);

  const locationClusters = useMemo(() => {
    if (!showCalculated) return [];
    return clusterInView(
      locations.map((loc) => ({
        lat: loc.displayLat,
        lng: loc.displayLng,
        data: loc,
      })),
      view.zoom,
      view.bounds
    );
  }, [locations, showCalculated, view]);

  const placeClusters = useMemo(() => {
    if (!showRated) return [];
    return clusterInView(
      places.map((place) => ({
        lat: Number(place.latitude) || 0,
        lng: Number(place.longitude) || 0,
        data: place,
      })),
      view.zoom,
      view.bounds
    );
  }, [places, showRated, view]);

  const handleLocationClusterClick = useCallback(
    (count: number, lat: number, lng: number, items: Location[]) => {
      if (count === 1) {
        onSelectLocation(items[0]);
        return;
      }
      if (view.zoom < 16) {
        map.flyTo([lat, lng], Math.min(view.zoom + 2, 16), { duration: 0.6 });
        return;
      }
      onSelectLocation(items[0], items);
    },
    [map, onSelectLocation, view.zoom]
  );

  const handlePlaceClusterClick = useCallback(
    (count: number, lat: number, lng: number, items: Place[]) => {
      if (count === 1) {
        onSelectPlace(items[0]);
        return;
      }
      if (view.zoom < 16) {
        map.flyTo([lat, lng], Math.min(view.zoom + 2, 16), { duration: 0.6 });
        return;
      }
      onSelectPlace(items[0], items);
    },
    [map, onSelectPlace, view.zoom]
  );

  return (
    <>
      {locationClusters.map((cluster) => (
        <Marker
          key={`loc-cluster-${cluster.id}`}
          position={{ lat: cluster.lat, lng: cluster.lng }}
          icon={
            cluster.count === 1
              ? poopIcon
              : getClusterIcon(cluster.count, "poop")
          }
          eventHandlers={{
            click: () =>
              handleLocationClusterClick(
                cluster.count,
                cluster.lat,
                cluster.lng,
                cluster.items.map((i) => i.data)
              ),
          }}
        />
      ))}

      {placeClusters.map((cluster) => (
        <Marker
          key={`place-cluster-${cluster.id}`}
          position={{ lat: cluster.lat, lng: cluster.lng }}
          icon={
            cluster.count === 1
              ? ratedIcon
              : getClusterIcon(cluster.count, "rated")
          }
          eventHandlers={{
            click: () =>
              handlePlaceClusterClick(
                cluster.count,
                cluster.lat,
                cluster.lng,
                cluster.items.map((i) => i.data)
              ),
          }}
        />
      ))}
    </>
  );
}

interface GoogleMapComponentProps {
  locations: Location[];
  places: { [key: string]: Place };
}

export function GoogleMapComponent({ locations, places }: GoogleMapComponentProps) {
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [clickedLocation, setClickedLocation] = useState<
    Place | Location | null
  >(null);
  const [clusterSiblings, setClusterSiblings] = useState<(Place | Location)[] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayMarkers, setDisplayMarkers] = useState({
    calculated: true,
    rated: true,
  });

  const [searchedPlace, setSearchedPlace] = useState<AutocompletePlace | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapTarget, setMapTarget] = useState<{ lat: number; lng: number } | null>(null);

  const handleSelectMapPlace = (place: AutocompletePlace) => {
    AudioService.playPop();
    setSearchedPlace(place);
    setSearchQuery(place.name);
    setMapTarget({ lat: place.latitude, lng: place.longitude });
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          setUserLocation({ lat: -23.5505, lng: -46.6333 });
        }
      );
    } else {
      setUserLocation({ lat: -23.5505, lng: -46.6333 });
    }
  }, []);

  const defaultCenter = { lat: -23.5505, lng: -46.6333 };
  const center = userLocation || defaultCenter;

  const isPlace = (item: Place | Location | null): item is Place => {
    return item !== null && (item as Place).cleanRating !== undefined;
  };

  const isLocation = (item: Place | Location | null): item is Location => {
    return item !== null && (item as Location).totalearned !== undefined;
  };

  const jitteredLocations = useMemo(() => {
    const coordCounts: { [key: string]: number } = {};
    return locations.map((loc) => {
      const lat = Number(loc.latitude) || 0;
      const lng = Number(loc.longitude) || 0;
      const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      const index = coordCounts[key] || 0;
      coordCounts[key] = index + 1;

      if (index === 0) {
        return { ...loc, displayLat: lat, displayLng: lng };
      }

      const angle = (index * 137.5 * Math.PI) / 180;
      const radius = 0.0006 * Math.sqrt(index);
      return {
        ...loc,
        displayLat: lat + radius * Math.cos(angle),
        displayLng: lng + radius * Math.sin(angle),
      };
    });
  }, [locations]);

  const openDetail = (item: Place | Location, siblings?: (Place | Location)[]) => {
    setClickedLocation(item);
    setClusterSiblings(siblings && siblings.length > 1 ? siblings : null);
    setIsModalOpen(true);
  };

  const renderRatingBar = (score: number = 0) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <FaToiletPaper
            key={i}
            size={18}
            className={i <= score ? "text-amber-500" : "text-gray-300"}
          />
        ))}
        <span className="font-primary text-lg text-primary font-bold ml-1">
          {score}/5
        </span>
      </div>
    );
  };

  const placesList = Object.values(places || {});

  return (
    <section className="w-full max-w-5xl mx-auto px-4 my-10">
      <div className="bg-background text-secondary rounded-2xl border-4 border-primary p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b-2 border-primary/20 mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <FaMapMarkedAlt className="text-primary text-3xl" />
              <h2 className="font-primary text-3xl sm:text-4xl text-primary font-bold">
                {translate("exploreMapTitle")}
              </h2>
            </div>
            <p className="font-secondary text-base sm:text-lg text-secondary-light mt-1">
              {translate("exploreSubtitle")}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto bg-background-dark p-2 rounded-xl border-2 border-primary/20">
            <button
              type="button"
              onClick={() =>
                setDisplayMarkers((prev) => ({
                  ...prev,
                  calculated: !prev.calculated,
                }))
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-secondary text-base transition-colors ${
                displayMarkers.calculated
                  ? "bg-primary text-background font-bold shadow-sm"
                  : "text-secondary hover:text-primary"
              }`}
            >
              {displayMarkers.calculated ? <FaCheckSquare /> : <FaRegSquare />}
              <img src="/caco.webp" alt="Pausas" className="w-6 h-6 inline" />
              <span>{translate("calculatedSessions")}</span>
              <span className="text-xs bg-background-dark/50 text-background px-1.5 py-0.5 rounded-full font-typewriter">
                {locations.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                setDisplayMarkers((prev) => ({
                  ...prev,
                  rated: !prev.rated,
                }))
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-secondary text-base transition-colors ${
                displayMarkers.rated
                  ? "bg-primary text-background font-bold shadow-sm"
                  : "text-secondary hover:text-primary"
              }`}
            >
              {displayMarkers.rated ? <FaCheckSquare /> : <FaRegSquare />}
              <img src="/sam.webp" alt="Avaliados" className="w-6 h-6 inline" />
              <span>{translate("ratedBathrooms")}</span>
              <span className="text-xs bg-background-dark/50 text-background px-1.5 py-0.5 rounded-full font-typewriter">
                {placesList.length}
              </span>
            </button>
          </div>
        </div>

        <div className="mb-4">
          <PlaceAutocomplete
            value={searchQuery}
            onChange={(val) => {
              setSearchQuery(val);
              if (!val) setSearchedPlace(null);
            }}
            onSelectPlace={handleSelectMapPlace}
            userLat={center.lat}
            userLng={center.lng}
            placeholder={translate("searchMapPlaceholder")}
          />

          {searchedPlace && (
            <div className="mt-2 py-1.5 px-3 bg-amber-50 rounded-lg border border-primary/30 flex items-center justify-between text-xs sm:text-sm font-secondary text-primary-dark">
              <span className="flex items-center gap-1.5 truncate">
                <FaMapMarkerAlt className="text-primary shrink-0" />
                <strong className="truncate">{searchedPlace.name}</strong>
                <span className="hidden sm:inline text-secondary-light">— {searchedPlace.fullAddress}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  AudioService.playPop();
                  setSearchedPlace(null);
                  setSearchQuery("");
                }}
                className="text-primary hover:text-primary-dark ml-2 underline text-xs shrink-0 cursor-pointer"
              >
                Limpar
              </button>
            </div>
          )}
        </div>

        <div className="rounded-xl overflow-hidden border-2 border-primary/30 shadow-inner relative">
          <MapContainer
            style={containerStyle}
            center={center}
            zoom={4}
            scrollWheelZoom={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            <SetViewOnce coords={userLocation} />
            <MapPanController targetCoords={mapTarget} zoom={14} />

            {searchedPlace && (
              <Marker
                position={{
                  lat: searchedPlace.latitude,
                  lng: searchedPlace.longitude,
                }}
              >
                <Popup>
                  <div className="font-secondary p-1">
                    <strong className="text-primary-dark block text-sm font-bold">
                      {searchedPlace.name}
                    </strong>
                    <span className="text-xs text-secondary-light block mt-0.5">
                      {searchedPlace.fullAddress}
                    </span>
                  </div>
                </Popup>
              </Marker>
            )}

            <ClusteredLayers
              locations={jitteredLocations}
              places={placesList}
              showCalculated={displayMarkers.calculated}
              showRated={displayMarkers.rated}
              onSelectLocation={(loc, siblings) => openDetail(loc, siblings)}
              onSelectPlace={(place, siblings) => openDetail(place, siblings)}
            />
          </MapContainer>
        </div>

        {(placesList.length > 0 || locations.length > 0) && (
          <p className="mt-3 flex items-center justify-center gap-2 text-center font-secondary text-sm text-secondary-light">
            <FaSearchPlus className="text-primary shrink-0" />
            <span>{translate("mapZoomHint")}</span>
          </p>
        )}

        {placesList.length === 0 && locations.length === 0 && (
          <div className="mt-3 py-2 px-4 bg-background-dark/80 rounded-lg border border-primary/20 text-center text-secondary font-secondary text-base">
            Nenhum ponto registrado no mapa ainda. Calcule uma pausa ou avalie um banheiro para adicionar o primeiro marcador!
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setClickedLocation(null);
          setClusterSiblings(null);
        }}
        title={
          clusterSiblings
            ? `${clusterSiblings.length} ${translate("mapClusterTitle")}`
            : clickedLocation && isPlace(clickedLocation)
            ? clickedLocation.name || "Banheiro Avaliado"
            : clickedLocation && isLocation(clickedLocation)
            ? clickedLocation.city || "Sessão no Trono"
            : "Detalhes do Local"
        }
      >
        {clusterSiblings && (
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto mb-2">
            {clusterSiblings.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  AudioService.playPop();
                  setClickedLocation(item);
                  setClusterSiblings(null);
                }}
                className="text-left bg-white p-3 rounded-lg border border-primary/20 hover:border-primary font-secondary text-secondary transition-colors"
              >
                {isPlace(item) ? (
                  <span className="font-bold text-primary-dark">{item.name || "Banheiro"}</span>
                ) : (
                  <>
                    <span className="font-bold text-primary-dark">{item.city || "Sessão"}</span>
                    <span className="text-primary ml-2">{item.totalearned}</span>
                    {item.day && (
                      <span className="text-xs text-secondary-light ml-2">{item.day}</span>
                    )}
                  </>
                )}
              </button>
            ))}
          </div>
        )}

        {!clusterSiblings && clickedLocation && isPlace(clickedLocation) && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-background-dark/70 p-4 rounded-xl border border-primary/20">
              <div className="flex flex-col items-center text-center p-2">
                <span className="font-secondary text-base text-secondary-light">
                  {translate("cleaness")}
                </span>
                {renderRatingBar(clickedLocation.cleanRating)}
              </div>

              <div className="flex flex-col items-center text-center p-2 border-y sm:border-y-0 sm:border-x border-primary/20">
                <span className="font-secondary text-base text-secondary-light">
                  {translate("facilities")}
                </span>
                {renderRatingBar(clickedLocation.facilitiesRating)}
              </div>

              <div className="flex flex-col items-center text-center p-2">
                <span className="font-secondary text-base text-secondary-light">
                  {translate("privacy")}
                </span>
                {renderRatingBar(clickedLocation.privacyRating)}
              </div>
            </div>

            <div>
              <h4 className="font-secondary text-xl text-primary font-bold mb-2">
                {translate("commentsLabel")}
              </h4>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {clickedLocation.notes && Array.isArray(clickedLocation.notes) ? (
                  clickedLocation.notes.map((note, i) => (
                    <div
                      key={i}
                      className="bg-white p-3 rounded-lg border border-primary/20 font-secondary text-base text-secondary"
                    >
                      <span className="text-primary-dark font-bold mr-2">
                        {translate("anonymous")}
                      </span>
                      "{note}"
                    </div>
                  ))
                ) : typeof clickedLocation.notes === "string" ? (
                  <div className="bg-white p-3 rounded-lg border border-primary/20 font-secondary text-base text-secondary">
                    "{clickedLocation.notes}"
                  </div>
                ) : (
                  <p className="font-secondary text-sm text-secondary-light italic">
                    Nenhum comentário adicionado ainda.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {!clusterSiblings && clickedLocation && isLocation(clickedLocation) && (
          <div className="flex flex-col gap-4 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <img src="/caco.webp" alt="Pausa" className="w-14 h-14" />
            </div>

            <div className="bg-background-dark/70 p-4 rounded-xl border border-primary/20">
              <span className="font-secondary text-base text-secondary-light block">
                {translate("totalEarned")}
              </span>
              <span className="font-primary text-4xl sm:text-5xl text-primary font-bold">
                {clickedLocation.totalearned}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-secondary font-typewriter text-base">
              <div className="bg-white p-3 rounded-lg border border-primary/20">
                <span className="text-xs text-secondary-light block">
                  {translate("start")}
                </span>
                <span className="font-bold text-primary">
                  {clickedLocation.timestarted || "-"}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-primary/20">
                <span className="text-xs text-secondary-light block">
                  {translate("end")}
                </span>
                <span className="font-bold text-primary">
                  {clickedLocation.timeended || "-"}
                </span>
              </div>
            </div>

            {clickedLocation.day && (
              <span className="text-sm font-typewriter text-secondary-light">
                Data: {clickedLocation.day}
              </span>
            )}
          </div>
        )}
      </Modal>
    </section>
  );
}

export default GoogleMapComponent;
