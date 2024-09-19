import { useState } from "react";
import { ComponentType } from "../../entities/ComponentType";
import ReactGA from "react-ga4";
import { Calculator } from "../Calculator";
import { RatePlace } from "../RatePlace";

export function Menu() {
  const [selectedComponent, setSelectedComponent] =
    useState<ComponentType | null>(null);

  return (
    <div className="flex flex-col w-full px-2">
      <div className="grid grid-cols-2 w-full gap-3">
        <div className={`w-full mt-10 flex justify-center lg:justify-end`}>
          <button
            className={`flex bg-primary p-4 gap-2 w-fit font-secondary text-2xl cursor-pointer items-center text-background border-4 border-primary rounded-lg h-fit ${
              selectedComponent === ComponentType.Calculator
                ? "border-2 border-background"
                : ""
            }`}
            onClick={() => {
              setSelectedComponent(ComponentType.Calculator);
              ReactGA.event({
                category: "Calculate",
                action: "Open Calculator",
                label: window.location.pathname + window.location.search,
              });
            }}
          >
            Calcular um <img src="/caco.png" className="w-16"></img>
          </button>
        </div>
        <div className={`w-full mt-10 justify-center lg:justify-start`}>
          <button
            className={`flex bg-primary p-4 mx-auto lg:mx-0 gap-2 w-fit font-secondary text-2xl cursor-pointer items-center text-background border-4 border-primary rounded-lg h-fit  ${
              selectedComponent === ComponentType.RatePlace
                ? "border-2 border-background"
                : ""
            }`}
            onClick={() => {
              setSelectedComponent(ComponentType.RatePlace);
              ReactGA.event({
                category: "Rate",
                action: "Open Rating",
                label: window.location.pathname + window.location.search,
              });
            }}
          >
            Avaliar um <img src="/sam.png" className="w-16"></img>
          </button>
        </div>
      </div>
      <div className="flex">
        <Calculator
          selectedComponent={selectedComponent}
          setSelectedComponent={setSelectedComponent}
        />
        <RatePlace
          selectedComponent={selectedComponent}
          setSelectedComponent={setSelectedComponent}
        />
      </div>
    </div>
  );
}
