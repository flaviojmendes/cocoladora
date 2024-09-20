import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvent,
} from "react-leaflet";
import L from "leaflet";
import { Place } from "../../entities/Place";
import "leaflet/dist/leaflet.css";
import { Modal } from "../Modal";
import { Location } from "../../entities/Location";
import { FaCheckSquare, FaSquare, FaToiletPaper } from "react-icons/fa";
import ReactGA from "react-ga4";
import { translate } from "../../languages/translator";

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

interface GoogleMapComponentProps {
  locations: Location[];
}

function GoogleMapComponent(props: GoogleMapComponentProps) {
  const [currentLocation, setCurrentLocation] = useState<Place | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [places, setPlaces] = useState<{ [key: string]: Place }>();
  const [clickedLocation, setClickedLocation] = useState<
    Place | Location | null
  >(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [displayMarkers, setDisplayMarkers] = useState({
    calculated: true,
    rated: true,
  });

  const customIcon = new L.Icon({
    iconUrl: "/sam.png", // Replace with the path to your custom icon
    iconSize: [30, 30], // Adjust the size as needed
    iconAnchor: [25, 50], // Adjust the anchor point as needed
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch(
        "https://getaverageratingsandnotesgroupedbylocation-pzeq65kcvq-uc.a.run.app"
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

  const MapClickHandler = ({
    setClickedLocation,
    setIsModalOpen,
  }: {
    setClickedLocation: (
      location: { latitude: number; longitude: number } | null
    ) => void;
    setIsModalOpen: (isOpen: boolean) => void;
  }) => {
    useMapEvent("click", (event) => {
      setClickedLocation({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
      setIsModalOpen(true);
    });
    return null;
  };

  const isPlace = (location: Place | Location | null): location is Place => {
    return location !== null && (location as Place).name !== undefined;
  };

  const isLocation = (
    location: Place | Location | null
  ): location is Location => {
    return location !== null && (location as Location).city !== undefined;
  };

  const renderIcons = (rating: number | undefined) => {
    if (!rating) {
      return null;
    }
    return Array.from({ length: 5 }, (_, index) => (
      <FaToiletPaper
        key={index}
        className={index < rating ? "text-yellow-500" : "text-gray-300"}
      />
    ));
  };

  return (
    <div className="mt-10">
      <div className="flex flex-col bg-background py-6de">
        <h1 className="text-4xl font-primary text-secondary font-bold text-center mt-10">
          Explore
        </h1>
        <div className="flex items-center justify-center gap-4 py-10">
          <button
            onClick={() =>
              setDisplayMarkers({
                calculated: !displayMarkers.calculated,
                rated: displayMarkers.rated,
              })
            }
            className="border-2 border-secondary bg-secondary-light items-center gap-2 text-background p-2 rounded-md flex font-bold text-2xl"
          >
            {displayMarkers.calculated ? <FaCheckSquare /> : <FaSquare />}{" "}
            <img src="/caco.png" className="w-16 h-16" />
          </button>
          <button
            onClick={() =>
              setDisplayMarkers({
                calculated: displayMarkers.calculated,
                rated: !displayMarkers.rated,
              })
            }
            className="border-2 border-secondary bg-secondary-light items-center gap-2 text-background p-2 rounded-md flex font-bold text-2xl"
          >
            {displayMarkers.rated ? <FaCheckSquare /> : <FaSquare />}{" "}
            <img src="/sam.png" className="w-16 h-16" />
          </button>
        </div>
      </div>
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
          displayMarkers.rated &&
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
                    ReactGA.event({
                      category: "Detail",
                      action: "View Rated Place",
                      label: window.location.pathname + window.location.search,
                    });
                  },
                }}
              />
            );
          })}
        {places &&
          displayMarkers.calculated &&
          props.locations.map((location: Location) => {
            const customPoopIcon = new L.Icon({
              iconUrl: "/caco.png", // Replace with the path to your custom icon
              iconSize: [30, 30], // Adjust the size as needed
              iconAnchor: [25, 50], // Adjust the anchor point as needed
            });

            return (
              <Marker
                key={`${location.latitude}, ${
                  location.longitude
                } ${Math.random()}`}
                position={{
                  lat: location.latitude,
                  lng: location.longitude,
                }}
                icon={customPoopIcon}
                eventHandlers={{
                  click: () => {
                    setCurrentLocation(location);
                    setClickedLocation(location);
                    setIsModalOpen(true);
                    ReactGA.event({
                      category: "Detail",
                      action: "View Calculated Poop",
                      label: window.location.pathname + window.location.search,
                    });
                  },
                }}
              />
            );
          })}
      </MapContainer>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        {clickedLocation && isPlace(clickedLocation) && (
          <div className="bg-background text-secondary font-secondary flex flex-col">
            <div className="flex flex-col items-center justify-between">
              <h1 className="text-4xl font-primary text-secondary font-bold">
                {clickedLocation.name}
              </h1>
              <div className="grid grid-cols-3 gap-12 mt-12">
                <div className="flex flex-col text-center">
                  <span className="text-2xl text-secondary ">
                    {translate("cleaness")}
                  </span>
                  <span className="text-md mt-4 text-secondary-light flex items-center justify-center gap-1">
                    {renderIcons(clickedLocation.cleanRating)}
                  </span>
                  <span className="text-md text-secondary">
                    {clickedLocation.cleanRating}/5
                  </span>
                  
                </div>
                <div className="flex flex-col text-center">
                  <span className="text-2xl text-secondary ">
                    {translate("facilities")}
                  </span>
                  <span className="text-md mt-4 text-secondary-light flex items-center justify-center gap-1">
                    {renderIcons(clickedLocation.facilitiesRating)}
                  </span>
                  <span className="text-md text-secondary-light">
                    {clickedLocation.facilitiesRating}/5
                  </span>
                </div>
                <div className="flex flex-col text-center">
                  <span className="text-2xl text-secondary ">
                    {translate("privacy")}
                  </span>
                  <span className="text-md mt-4 text-secondary-light flex items-center justify-center gap-1">
                    {renderIcons(clickedLocation.privacyRating)}
                  </span>
                  <span className="text-md text-secondary-light">
                    {clickedLocation.privacyRating}/5
                  </span>
                </div>
              </div>

              <div className="flex flex-col mt-10 w-full">
                <span className="text-2xl font-bold text-center">
                  {translate("commentsLabel")}{" "}
                </span>
                {clickedLocation.notes &&
                  Array.isArray(clickedLocation.notes) &&
                  clickedLocation.notes.map((note) => (
                    <span className="text-lg font-bold ">
                      <span className="text-secondary-light text-opacity-80">
                        {translate("anonymous")}{" "}
                      </span>{" "}
                      {note}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        )}
        {clickedLocation && isLocation(clickedLocation) && (
          <div>
            <div className="bg-background text-secondary font-secondary flex flex-col">
              <div className="flex flex-col items-center justify-between">
                <h1 className="text-4xl font-primary text-secondary font-bold">
                  {clickedLocation.city}
                </h1>
              </div>

              <div className="grid grid-cols-2 gap-28 mt-12">
                <div className="flex flex-col text-right">
                  <span className="text-2xl text-secondary ">
                    {translate("start")}
                  </span>
                  <span className="text-xl text-secondary-light">
                    {clickedLocation.timestarted}
                  </span>
                </div>
                <div className="flex flex-col text-start">
                  <span className="text-2xl text-secondary ">
                    {translate("end")}
                  </span>
                  <span className="text-xl text-secondary-light">
                    {clickedLocation.timeended}
                  </span>
                </div>
              </div>

              <div className="flex flex-col text-center mt-10">
                <span className="text-2xl text-secondary ">
                  {translate("totalEarned")}
                </span>
                <span className="text-xl text-secondary-light">
                  {clickedLocation.totalearned}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default GoogleMapComponent;
