import React, { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import "./App.css";
import ReactGA from "react-ga4";
import GoogleMapComponent, { Location } from "./components/GoogleMapsComponent";

import "odometer/themes/odometer-theme-minimal.css";
import { Calculator } from "./components/Calculator";
import { Cocometer } from "./components/Cocometer";

function App() {
  ReactGA.initialize(import.meta.env.VITE_GOOGLE_ANALYTICS_ID);
  ReactGA.send({
    hitType: "pageview",
    page: window.location.pathname + window.location.search,
  });

  const [locations, setLocations] = useState<Location[]>([]);

  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    totalEarned: string | number;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

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

  return (
    <div className="bg-secondary-light w-full h-full flex flex-col">
      <div className="flex">
        <Calculator fetchData={fetchData} />
        <div className="flex"></div>
      </div>
      <div className="text-background">
        <Cocometer title="Cocômetro" locations={locations} />
      </div>
      {/* Google Map Component */}
      <div className="mt-0   z-0 bg-background bg-opacity-50">
        <GoogleMapComponent locations={locations} />
      </div>

      <footer className="flex w-full text-background font-primary text-center py-2 sticky text-3xl items-end">
        <div className="flex mx-auto items-center">
          <span>Feito com 💩 por</span>
          <a target="_blank" href="https://instagram.com/trilhainfo">
            <img src="/trilhainfo.png" className="w-48" />
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
