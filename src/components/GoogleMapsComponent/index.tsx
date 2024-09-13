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
  totalEarned: number | string;
  timeStarted?: string;
  timeEnded?: string;
  day?: string;
  city?: string;
}

interface GoogleMapComponentProps {
  locations: Location[];
}

function GoogleMapComponent(props: GoogleMapComponentProps) {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);



  useEffect(() => {
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * props.locations.length);
      const newLocation = props.locations[randomIndex];
      setCurrentLocation(newLocation);
      if (mapRef.current) {
        mapRef.current.setCenter({
          lat: newLocation.latitude,
          lng: newLocation.longitude,
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [props.locations]);

  return (
    <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        options={{
          styles: mapStyles,
          disableDefaultUI: true, // Disable all controls
          draggable: false, // Disable map dragging
          scrollwheel: false, // Disable zooming with scroll wheel
        }}
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
