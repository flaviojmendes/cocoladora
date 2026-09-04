import React, { useState, useEffect } from "react";
import "./App.css";
import ReactGA from "react-ga4";
import { GoogleMapComponent } from "./components/GoogleMapsComponent";
import { Location } from "./entities/Location";
import { Place } from "./entities/Place";
import { GiBrazilFlag, GiUsaFlag } from "react-icons/gi";
import { Cocometer } from "./components/Cocometer";
import { Menu } from "./components/Menu";
import { FaDonate, FaInstagram, FaPaypal, FaRocket, FaVolumeUp, FaVolumeMute } from "react-icons/fa";
import { translate } from "./languages/translator";
import { ToiletDoor } from "./components/ToiletDoor";
import { ApiService } from "./services/api";
import { AnnualProjections } from "./components/AnnualProjections";
import { ThroneEntertainment } from "./components/ThroneEntertainment";
import { TrophyCase } from "./components/TrophyCase";
import { AudioService } from "./utils/audio";

function App() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [places, setPlaces] = useState<{ [key: string]: Place }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(() => AudioService.getSoundEnabled());

  const [currentLang, setCurrentLang] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("userLanguage");
      if (saved) return saved.replace(/"/g, "");
      const nav = navigator.language.toLowerCase();
      return nav.includes("pt") ? "pt" : "en";
    } catch {
      return "pt";
    }
  });

  // Load real data from Vercel Postgres API
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const data = await ApiService.getBootstrap();
        if (isMounted) {
          setLocations(data.locations);
          setPlaces(data.places);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error loading initial data:", err);
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    // Safe Google Analytics initialization
    const gaId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;
    if (gaId) {
      try {
        ReactGA.initialize(gaId);
        ReactGA.event({
          category: "Access",
          action: "Accessed page",
          label: window.location.pathname + window.location.search,
        });
      } catch (err) {
        console.warn("GA initialization error:", err);
      }
    }
  }, []);

  const changeLanguage = (lang: string) => {
    AudioService.playPop();
    setCurrentLang(lang);
    localStorage.setItem("userLanguage", JSON.stringify(lang));
    // Force a minimal state update to re-render translations
    setLocations((prev) => [...prev]);
  };

  const toggleMasterSound = () => {
    const next = AudioService.toggleSound();
    setSoundEnabled(next);
  };

  const handleLocationsUpdated = (updatedLocations: Location[]) => {
    setLocations(updatedLocations);
  };

  const handlePlaceAdded = (updatedPlaces: { [key: string]: Place }) => {
    setPlaces(updatedPlaces);
  };

  const openZeroToMVP = () => {
    AudioService.playPop();
    try {
      ReactGA.event({
        category: "ZeroToMVP",
        action: "Clicked on Zero to MVP",
        label: window.location.pathname,
      });
    } catch {}
    window.open("https://flaviojmendes.gumroad.com/l/dozeroaomvp", "_blank");
  };

  return (
    <div className="bg-[#413831] min-h-screen w-full flex flex-col text-background font-body selection:bg-primary selection:text-background">
      {/* Top Bar Navigation */}
      <header className="sticky top-0 z-50 w-full bg-[#292420]/95 backdrop-blur-md border-b border-primary/30 py-2.5 px-4 sm:px-8 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Left Controls: Language Switcher, Audio Toggle & Trophy Case */}
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="flex items-center gap-1.5 bg-background/10 py-1 px-2.5 rounded-lg border border-background/20">
              <button
                type="button"
                onClick={() => changeLanguage("pt")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-sm sm:text-base font-secondary transition-all ${
                  currentLang.includes("pt")
                    ? "bg-primary text-background font-bold shadow-sm"
                    : "text-background/70 hover:text-background"
                }`}
              >
                <span>PT</span>
                <GiBrazilFlag className="text-lg" />
              </button>

              <div className="w-[1px] h-4 bg-background/30" />

              <button
                type="button"
                onClick={() => changeLanguage("en")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-sm sm:text-base font-secondary transition-all ${
                  currentLang.includes("en")
                    ? "bg-primary text-background font-bold shadow-sm"
                    : "text-background/70 hover:text-background"
                }`}
              >
                <span>EN</span>
                <GiUsaFlag className="text-lg" />
              </button>
            </div>

            {/* Master Sound FX Toggle */}
            <button
              type="button"
              onClick={toggleMasterSound}
              aria-label={soundEnabled ? "Desativar sons" : "Ativar sons"}
              title={soundEnabled ? "Sons Ativados" : "Sons Mutados"}
              className={`p-2 rounded-lg border transition-all ${
                soundEnabled
                  ? "bg-primary/80 border-primary-light text-amber-300"
                  : "bg-background/10 border-background/20 text-background/50 hover:text-background"
              }`}
            >
              {soundEnabled ? <FaVolumeUp size={16} /> : <FaVolumeMute size={16} />}
            </button>

            {/* Achievements Trophy Case */}
            <TrophyCase />
          </div>

          {/* Do Zero ao MVP Link */}
          <div className="hidden lg:flex items-center gap-2 text-sm sm:text-base font-secondary text-background/90">
            <span>Quer aprender a desenvolver um produto como esse?</span>
            <button
              type="button"
              onClick={openZeroToMVP}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary hover:bg-primary-light text-background font-bold transition-all shadow-sm hover:scale-105 active:scale-95"
            >
              <span>Do Zero ao MVP</span>
              <FaRocket className="text-xs" />
            </button>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-3 sm:gap-4 text-background/80">
            <a
              href="https://instagram.com/trilhainfo"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="hover:text-amber-400 transition-colors p-1"
            >
              <FaInstagram className="text-xl sm:text-2xl" />
            </a>
            <a
              href="https://apoia.se/trilhainfo"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Apoia.se"
              className="hover:text-amber-400 transition-colors p-1"
            >
              <FaDonate className="text-xl sm:text-2xl" />
            </a>
            <a
              href="https://www.paypal.com/donate/?hosted_button_id=9LR5BW2NCE25U"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="PayPal"
              className="hover:text-amber-400 transition-colors p-1"
            >
              <FaPaypal className="text-xl sm:text-2xl" />
            </a>
          </div>
        </div>

        {/* Mobile Promo Banner */}
        <div className="flex lg:hidden items-center justify-center gap-2 pt-2 mt-2 border-t border-background/10 text-xs font-secondary text-background/90">
          <span>Quer criar um app como esse?</span>
          <button
            type="button"
            onClick={openZeroToMVP}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-primary text-background font-bold hover:bg-primary-light transition-all"
          >
            <span>Do Zero ao MVP</span>
            <FaRocket className="text-[10px]" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="w-full max-w-4xl mx-auto text-center pt-8 pb-4 px-4 flex flex-col items-center">
        <a
          href="https://instagram.com/trilhainfo"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 group transition-transform hover:scale-105"
        >
          <img
            src="/caco.webp"
            alt="Cocoladora Mascot"
            className="w-20 sm:w-28 drop-shadow-lg"
          />
          <h1 className="text-5xl sm:text-7xl font-bold font-primary text-background tracking-normal group-hover:text-amber-300 transition-colors">
            Cocoladora
          </h1>
        </a>

        <p className="font-secondary text-xl sm:text-2xl text-background/90 max-w-xl mt-3">
          {translate("subtitle")}
        </p>
      </section>

      {/* Main Interactive Menu with Calculator & Restroom Rater */}
      <main className="w-full flex-grow">
        <Menu
          locations={locations}
          onLocationsUpdated={handleLocationsUpdated}
          places={places}
          onPlaceAdded={handlePlaceAdded}
        />

        {/* Annual Projections ROI Calculator */}
        <AnnualProjections />

        {/* Offline Throne Entertainment Pastimes */}
        <ThroneEntertainment />

        {/* Community Toilet Door */}
        <ToiletDoor />

        {/* Leaflet Interactive Map */}
        <GoogleMapComponent locations={locations} places={places} />

        {/* Global Cocometer Odometer */}
        <Cocometer title={translate("cocometer")} locations={locations} />
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#292420] border-t border-primary/30 py-6 px-4 mt-12 text-center text-background">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 font-secondary text-xl">
          <span>{translate("madeWith")}</span>
          <a
            href="https://instagram.com/trilhainfo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block transition-transform hover:scale-105"
          >
            <img
              src="/trilhainfo.png"
              alt="Trilha Info"
              className="w-36 sm:w-44 brightness-110"
            />
          </a>
        </div>
        <p className="font-typewriter text-xs text-background/60 mt-2">
          Vercel Serverless • Vercel Postgres • Dados 100% Reais
        </p>
      </footer>
    </div>
  );
}

export default App;
