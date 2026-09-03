import React, { useEffect, useState, useMemo } from "react";
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
  FaStar,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { translate } from "../../languages/translator";
import { PlaceAutocomplete } from "../PlaceAutocomplete";
import { AutocompletePlace } from "../../services/geocoding";
import { AudioService } from "../../utils/audio";

const containerStyle = {
  width: "100%",
  height: "560px",
  zIndex: 1,
};

function SetViewOnClick({ coords }: { coords: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, map.getZoom());
  }, [coords, map]);
  return null;
}

function MapPanController({ targetCoords, zoom }: { targetCoords: { lat: number; lng: number } | null; zoom?: number }) {
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayMarkers, setDisplayMarkers] = useState({
    calculated: true,
    rated: true,
  });

  // Autocomplete search states
  const [searchedPlace, setSearchedPlace] = useState<AutocompletePlace | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapTarget, setMapTarget] = useState<{ lat: number; lng: number } | null>(null);

  const handleSelectMapPlace = (place: AutocompletePlace) => {
    AudioService.playPop();
    setSearchedPlace(place);
    setSearchQuery(place.name);
    setMapTarget({ lat: place.latitude, lng: place.longitude });
  };

  // Custom marker icons
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
          // Fallback center: São Paulo
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

  // Group identical coordinates and slightly offset them deterministically so all markers are visible and clickable
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

      // Small spiral jitter (~30-60m) so multiple pins at the exact same coordinates don't completely overlap
      const angle = (index * 137.5 * Math.PI) / 180;
      const radius = 0.0006 * Math.sqrt(index);
      return {
        ...loc,
        displayLat: lat + radius * Math.cos(angle),
        displayLng: lng + radius * Math.sin(angle),
      };
    });
  }, [locations]);

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
        {/* Header & Filter Controls */}
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

          {/* Marker Filter Toggles */}
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

        {/* Map Location Autocomplete Search Bar */}
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

        {/* The Leaflet Map Container */}
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

            {userLocation && <SetViewOnClick coords={userLocation} />}
            <MapPanController targetCoords={mapTarget} zoom={14} />

            {/* Searched Location Pin */}
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

            {/* Rated Places Markers */}
            {displayMarkers.rated &&
              placesList.map((place) => (
                <Marker
                  key={place.id || `${place.latitude}-${place.longitude}`}
                  position={{
                    lat: place.latitude,
                    lng: place.longitude,
                  }}
                  icon={ratedIcon}
                  eventHandlers={{
                    click: () => {
                      setClickedLocation(place);
                      setIsModalOpen(true);
                    },
                  }}
                />
              ))}

            {/* Calculated Sessions Markers */}
            {displayMarkers.calculated &&
              jitteredLocations.map((loc, idx) => (
                <Marker
                  key={`loc-${loc.id || idx}-${loc.latitude}-${loc.longitude}-${idx}`}
                  position={{
                    lat: loc.displayLat,
                    lng: loc.displayLng,
                  }}
                  icon={poopIcon}
                  eventHandlers={{
                    click: () => {
                      setClickedLocation(loc);
                      setIsModalOpen(true);
                    },
                  }}
                />
              ))}
          </MapContainer>
        </div>

        {placesList.length === 0 && locations.length === 0 && (
          <div className="mt-3 py-2 px-4 bg-background-dark/80 rounded-lg border border-primary/20 text-center text-secondary font-secondary text-base">
            Nenhum ponto registrado no mapa ainda. Calcule uma pausa ou avalie um banheiro para adicionar o primeiro marcador!
          </div>
        )}
      </div>

      {/* Detail Modal for Selected Marker */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setClickedLocation(null);
        }}
        title={
          clickedLocation && isPlace(clickedLocation)
            ? clickedLocation.name || "Banheiro Avaliado"
            : clickedLocation && isLocation(clickedLocation)
            ? clickedLocation.city || "Sessão no Trono"
            : "Detalhes do Local"
        }
      >
        {clickedLocation && isPlace(clickedLocation) && (
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

            {/* Comments list */}
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

        {clickedLocation && isLocation(clickedLocation) && (
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
