import { useState, useEffect } from "react";
import "./App.css";
import ReactGA from "react-ga4";
import GoogleMapComponent from "./components/GoogleMapsComponent";
import { Location } from "./entities/Location";

import "odometer/themes/odometer-theme-minimal.css";
import { Cocometer } from "./components/Cocometer";
import { Place } from "./entities/Place";
import { ComponentType } from "./entities/ComponentType";
import { Menu } from "./components/Menu";
import { FaDonate, FaInstagram } from "react-icons/fa";

function App() {
  ReactGA.initialize(import.meta.env.VITE_GOOGLE_ANALYTICS_ID);
  ReactGA.event({
    category: "Access",
    action: "Accessed page",
    label: window.location.pathname + window.location.search,
  });

  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    fetchCocometerData();
  }, []);

  const fetchCocometerData = async () => {
    try {
      const response = await fetch(
        "https://listlocationdata-pzeq65kcvq-uc.a.run.app"
      );
      const data = await response.json();
      setLocations(data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  return (
    <div className="bg-secondary-light w-full h-full flex flex-col">
      {/* Sticky header */}
      <div className="flex w-full justify-end text-background font-secondary text-center py-2 sticky top-0 text-xl px-2 lg:px-10 items-end bg-secondary bg-opacity-75 z-10 gap-4 shadow-sm">
        <a href="https://instagram.com/trilhainfo" target="_blank">
          <FaInstagram className="text-3xl lg:text-4xl" />
        </a>
        <a href="https://apoia.se/trilhainfo" target="_blank">
          <FaDonate className="text-3xl lg:text-4xl" />
        </a>
      </div>
      <div className="flex items-end w-fit mx-auto mb-4">
        <a target="_blank" href="https://instagram.com/trilhainfo">
          <img src="/caco.png" className="w-24 lg:w-32" />
        </a>
        <h1 className="text-4xl lg:text-6xl font-bold ml-4 font-primary text-background">
          <a target="_blank" href="https://instagram.com/trilhainfo">
            Cocoladora
          </a>
        </h1>
      </div>

      <Menu />

      {/* Google Map Component */}

      <div className="mt-0 z-0">
        <GoogleMapComponent locations={locations} />
      </div>
      <div className="text-background">
        <Cocometer title="Cocômetro" locations={locations} />
      </div>
      <footer className="flex w-full text-background font-primary text-center py-2 sticky text-3xl items-end">
        <div className="flex mx-auto items-center">
          <span>Feito com 💩 por</span>
          <a
            target="_blank"
            href="https://instagram.com/trilhainfo"
            className="cursor-pointer"
          >
            <img src="/trilhainfo.png" className="w-48 cursor-pointer" />
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
