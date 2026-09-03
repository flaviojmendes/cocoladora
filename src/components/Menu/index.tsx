import React, { useState } from "react";
import { ComponentType } from "../../entities/ComponentType";
import ReactGA from "react-ga4";
import { Calculator } from "../Calculator";
import { RatePlace } from "../RatePlace";
import { translate } from "../../languages/translator";
import { Location } from "../../entities/Location";
import { Place } from "../../entities/Place";

interface MenuProps {
  locations: Location[];
  onLocationsUpdated: (locations: Location[]) => void;
  places: { [key: string]: Place };
  onPlaceAdded: (places: { [key: string]: Place }) => void;
}

export function Menu({
  onLocationsUpdated,
  onPlaceAdded,
}: MenuProps) {
  const [selectedComponent, setSelectedComponent] =
    useState<ComponentType | null>(null);

  const toggleComponent = (comp: ComponentType) => {
    setSelectedComponent((prev) => (prev === comp ? null : comp));
  };

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto px-4">
      {/* 3 Main Action Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
        {/* Calculate Button */}
        <button
          type="button"
          onClick={() => {
            toggleComponent(ComponentType.Calculator);
            try {
              ReactGA.event({
                category: "Calculate",
                action: "Toggle Calculator",
                label: window.location.pathname,
              });
            } catch {}
          }}
          className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border-4 transition-all duration-200 text-left shadow-lg ${
            selectedComponent === ComponentType.Calculator
              ? "bg-primary-dark border-background text-background scale-[1.02] ring-4 ring-primary/40"
              : "bg-primary hover:bg-primary-dark border-primary text-background hover:scale-[1.01]"
          }`}
        >
          <div>
            <span className="font-primary text-2xl sm:text-3xl font-bold block leading-tight">
              {translate("calculatePoop")} 💩
            </span>
            <span className="font-secondary text-sm sm:text-base opacity-90 block mt-1">
              Descubra seu faturamento no trono
            </span>
          </div>
          <img
            src="/caco.webp"
            alt="Mascot Caco"
            className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 transition-transform group-hover:scale-110 ml-2"
          />
        </button>

        {/* Rate Restroom Button */}
        <button
          type="button"
          onClick={() => {
            toggleComponent(ComponentType.RatePlace);
            try {
              ReactGA.event({
                category: "Rate",
                action: "Toggle Rating",
                label: window.location.pathname,
              });
            } catch {}
          }}
          className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border-4 transition-all duration-200 text-left shadow-lg ${
            selectedComponent === ComponentType.RatePlace
              ? "bg-primary-dark border-background text-background scale-[1.02] ring-4 ring-primary/40"
              : "bg-primary hover:bg-primary-dark border-primary text-background hover:scale-[1.01]"
          }`}
        >
          <div>
            <span className="font-primary text-2xl sm:text-3xl font-bold block leading-tight">
              {translate("ratePoop")} 🧻
            </span>
            <span className="font-secondary text-sm sm:text-base opacity-90 block mt-1">
              Avalie a limpeza e privacidade
            </span>
          </div>
          <img
            src="/sam.webp"
            alt="Mascot Sam"
            className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 transition-transform group-hover:scale-110 ml-2"
          />
        </button>

        {/* Write on Door Anchor Button */}
        <a
          href="#writeMessage"
          className="flex items-center justify-between p-4 sm:p-5 rounded-2xl border-4 border-primary bg-primary hover:bg-primary-dark text-background transition-all duration-200 text-left shadow-lg hover:scale-[1.01]"
        >
          <div>
            <span className="font-primary text-2xl sm:text-3xl font-bold block leading-tight">
              {translate("writeMessage")} ✍️
            </span>
            <span className="font-secondary text-sm sm:text-base opacity-90 block mt-1">
              Deixe seu grafite na porta do trono
            </span>
          </div>
          <img
            src="/dora.webp"
            alt="Mascot Dora"
            className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 transition-transform group-hover:scale-110 ml-2"
          />
        </a>
      </div>

      {/* Expanded Feature Panel (Calculator or RatePlace) */}
      <div className="w-full">
        <Calculator
          selectedComponent={selectedComponent}
          setSelectedComponent={setSelectedComponent}
          onLocationsUpdated={onLocationsUpdated}
        />
        <RatePlace
          selectedComponent={selectedComponent}
          setSelectedComponent={setSelectedComponent}
          onPlaceAdded={onPlaceAdded}
        />
      </div>
    </div>
  );
}
