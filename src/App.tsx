import { useState, useEffect } from "react";
import "./App.css";
import ReactGA from "react-ga4";
import GoogleMapComponent from "./components/GoogleMapsComponent";
import { Location } from "./entities/Location";
import { GiBrazilFlag, GiUsaFlag } from "react-icons/gi";

import "odometer/themes/odometer-theme-minimal.css";
import { Cocometer } from "./components/Cocometer";
import { Place } from "./entities/Place";
import { ComponentType } from "./entities/ComponentType";
import { Menu } from "./components/Menu";
import { FaDonate, FaInstagram, FaPaypal } from "react-icons/fa";
import { translate } from "./languages/translator";
import { useLocalStorage } from "@uidotdev/usehooks";

function App() {
  ReactGA.initialize(import.meta.env.VITE_GOOGLE_ANALYTICS_ID);
  ReactGA.event({
    category: "Access",
    action: "Accessed page",
    label: window.location.pathname + window.location.search,
  });

  const [locations, setLocations] = useState<Location[]>([]);
  const [userLanguage, setUserLanguage] = useLocalStorage("userLanguage", "pt");

  useEffect(() => {
    fetchCocometerData();
    // get user language
    console.log(navigator.language);
    if (!userLanguage) {
      setUserLanguage(navigator.language);
    }
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
      <div className="flex w-full text-background font-secondary text-center py-2 sticky top-0 text-xl px-2 lg:px-10 items-end bg-secondary bg-opacity-75 z-10 gap-4 shadow-sm">
        <div className="flex gap-4 h-full">
          <button
            onClick={() => setUserLanguage("pt")}
            className="cursor-pointer"
          >
            <span className="flex gap-1 items-center">PT<GiBrazilFlag /></span>
          </button>
          <div className="h-full border-l-2 border-l-background w-2">{" "}</div>
          <button
            onClick={() => setUserLanguage("en")}
            className="cursor-pointer"
          >
             <span className="flex gap-1 items-center">EN<GiUsaFlag /></span>
          </button>
        </div>
        <div className="flex grow justify-end gap-4">
          <a href="https://instagram.com/trilhainfo" target="_blank">
            <FaInstagram className="text-3xl lg:text-4xl" />
          </a>
          <a href="https://apoia.se/trilhainfo" target="_blank">
            <FaDonate className="text-3xl lg:text-4xl" />
          </a>
          <a href="https://www.paypal.com/donate/?hosted_button_id=9LR5BW2NCE25U" target="_blank">
            <FaPaypal className="text-3xl lg:text-4xl" />
          </a>
        </div>
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
        <Cocometer title={translate("cocometer")} locations={locations} />
      </div>
      <footer className="flex w-full text-background font-primary text-center py-2 sticky text-3xl items-end">
        <div className="flex mx-auto items-center">
          <span>{translate("madeWith")}</span>
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
