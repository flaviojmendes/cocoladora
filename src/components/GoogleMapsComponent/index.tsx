import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvent } from "react-leaflet";
import L from "leaflet";
import { Place } from "../../entities/Place";
import "leaflet/dist/leaflet.css";
import { Modal } from "../Modal";
import { zIndex } from "html2canvas/dist/types/css/property-descriptors/z-index";

const containerStyle = {
  width: "100%",
  height: "600px",
  zIndex: 0,
};


function SetViewOnClick({ coords }: { coords: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, map.getZoom());
  }, [coords, map]);
  return null;
}

function GoogleMapComponent() {
  const [currentLocation, setCurrentLocation] = useState<Place | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [places, setPlaces] = useState<{ [key: string]: Place }>();
  const [clickedLocation, setClickedLocation] = useState<Place | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const customIcon = new L.Icon({
    iconUrl: "/sam.png", // Replace with the path to your custom icon
    iconSize: [50, 50], // Adjust the size as needed
    iconAnchor: [25, 50], // Adjust the anchor point as needed
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch(
        "https://getaverageratingsandnotesgroupedbylocation-k2ngx5ghxq-uc.a.run.app"
      );
      const data = await response.json();
      setPlaces(data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error("Error getting user location:", error);
      }
    );
  }, []);

  const defaultCenter = { lat: -3.745, lng: -38.523 };
  const center = userLocation || defaultCenter;

  const handleMapClick = (event: L.LeafletMouseEvent) => {
    setClickedLocation({
      latitude: event.latlng.lat,
      longitude: event.latlng.lng,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setClickedLocation(null);
  };

  const MapClickHandler = ({ setClickedLocation, setIsModalOpen }: { setClickedLocation: (location: { latitude: number; longitude: number } | null) => void, setIsModalOpen: (isOpen: boolean) => void }) => {
    useMapEvent('click', (event) => {
      setClickedLocation({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
      setIsModalOpen(true);
    });
    return null;
  };

  return (
    <div>
      <MapContainer
        style={containerStyle}
        center={center}
        zoom={10}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {userLocation && <SetViewOnClick coords={userLocation} />}
        {places &&
          Object.keys(places).map((key) => {
            return (
              <Marker
                key={key}
                position={{
                  lat: places[key].latitude,
                  lng: places[key].longitude,
                }}
                icon={customIcon}
                eventHandlers={{
                  click: () => {
                    setCurrentLocation(places[key]);
                    setClickedLocation(places[key]);
                    setIsModalOpen(true);
                  },
                }}
              />
            );
          })}
      </MapContainer>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        {clickedLocation && (
          <div className="bg-background text-secondary font-secondary flex flex-col">
            <div className="flex flex-col items-center justify-between">
              <h1 className="text-4xl font-primary text-secondary font-bold">
                {clickedLocation.name}
              </h1>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col text-center">
                  <span className="text-2xl text-secondary ">Limpeza</span>
                  <span className="text-xl text-secondary-light">
                    {clickedLocation.cleanRating}
                  </span>
                </div>
                <div className="flex flex-col text-center">
                  <span className="text-2xl text-secondary ">Facilidades</span>
                  <span className="text-xl text-secondary-light">
                    {clickedLocation.facilitiesRating}
                  </span>
                </div>
                <div className="flex flex-col text-center">
                  <span className="text-2xl text-secondary ">Privacidade</span>
                  <span className="text-xl text-secondary-light">
                    {clickedLocation.privacyRating}
                  </span>
                </div>
              </div>

              <div className="flex flex-col mt-10 w-full">
                <span className="text-2xl font-bold text-center">Comentários: </span>
                {clickedLocation.notes &&
                  Array.isArray(clickedLocation.notes) &&
                  clickedLocation.notes.map((note) => (
                    <span className="text-lg font-bold "><span className="text-secondary-light text-opacity-80">Anônimo:</span> {note}</span>
                  ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default GoogleMapComponent;
