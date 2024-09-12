import React, { useEffect, useState, useRef } from "react";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import { mapStyles } from "./styles";

const containerStyle = {
  width: "100%",
  height: "600px",
};

const center = {
  lat: -3.745,
  lng: -38.523,
};

export interface Location {
  latitude: number;
  longitude: number;
  totalEarned: number;
}

interface GoogleMapComponentProps {
  locations: Location[];
}

interface GoogleMapComponentProps {
  locations: { latitude: number; longitude: number; totalEarned: number }[];
}

function GoogleMapComponent(locationsReceived: GoogleMapComponentProps) {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          "https://listlocationdata-k2ngx5ghxq-uc.a.run.app"
        );
        const data = await response.json();
        setLocations(data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * locations.length);
      const newLocation = locations[randomIndex];
      setCurrentLocation(newLocation);
      if (mapRef.current) {
        mapRef.current.setCenter({
          lat: newLocation.latitude,
          lng: newLocation.longitude,
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [locations]);

  return (
    <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        options={{ styles: mapStyles }}
        zoom={10}
        onLoad={(map) => {
          mapRef.current = map;
        }}
      >
        {currentLocation && (
          <Marker
            position={{
              lat: currentLocation.latitude,
              lng: currentLocation.longitude,
            }}
            icon={{
              url: "/circle.svg",
              scaledSize: new google.maps.Size(80, 80),
              labelOrigin: new google.maps.Point(40, 40),
            }}
            label={{
              text: `${currentLocation.totalEarned}`,
              color: "white",
              fontFamily: "Chicle",
              fontSize: "24px",
            }}
          />
        )}
      </GoogleMap>
    </LoadScript>
  );
}

export default GoogleMapComponent;
