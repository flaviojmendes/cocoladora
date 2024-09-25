import { useState } from "react";
import { ComponentType } from "../../entities/ComponentType";
import ReactGA from "react-ga4";
import { Calculator } from "../Calculator";
import { RatePlace } from "../RatePlace";
import { translate } from "../../languages/translator";

export function Menu() {
  const [selectedComponent, setSelectedComponent] =
    useState<ComponentType | null>(null);

  return (
    <div className="flex flex-col w-full px-2">
      <div className="flex w-full gap-3 justify-center">
        <div className={`mt-10 flex justify-center lg:justify-end`}>
          <button
            className={`flex flex-col lg:flex-row bg-primary p-4 h-full gap-2 w-fit font-secondary text-2xl cursor-pointer items-center text-background border-4 border-primary rounded-lg ${
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
            {translate("calculatePoop")}{" "}
            <img src="/caco.webp" className="w-16 h-16"></img>
          </button>
        </div>
        <div className={`mt-10 justify-center lg:justify-start`}>
          <button
            className={`flex flex-col lg:flex-row bg-primary p-4 mx-auto lg:mx-0 gap-2 w-fit font-secondary text-2xl cursor-pointer items-center text-background border-4 border-primary rounded-lg h-full  ${
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
            {translate("ratePoop")}{" "}
            <img src="/sam.webp" className="w-16 h-16"></img>
          </button>
        </div>
        <div className={`mt-10 justify-center lg:justify-start`}>
          <a
            href="#writeMessage"
            className={`flex flex-col lg:flex-row text text-center bg-primary p-4 mx-auto lg:mx-0 gap-2 w-fit font-secondary text-2xl cursor-pointer items-center text-background border-4 border-primary rounded-lg h-fit`}
          >
            <div className="flex flex-col items-center">
              {translate("writeMessage")}
              <span className="text-sm">{translate("limitedSpaces")}</span>
            </div>
            <img src="/dora.webp" className="w-16 h-16 ml-2" />
          </a>
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
