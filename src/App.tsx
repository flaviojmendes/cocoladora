import React, { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import "./App.css";
import ReactGA from "react-ga4";
import GoogleMapComponent, { Location } from "./components/GoogleMapsComponent";
import Odometer from "react-odometerjs";
import "odometer/themes/odometer-theme-minimal.css";
import { Calculator } from "./components/Calculator";

function App() {
  ReactGA.initialize(import.meta.env.VITE_GOOGLE_ANALYTICS_ID);
  ReactGA.send({
    hitType: "pageview",
    page: window.location.pathname + window.location.search,
  });

  const [locations, setLocations] = useState<Location[]>([]);
  const [totalEarningsByCurrency, setTotalEarningsByCurrency] = useState<{
    BRL: number;
    USD: number;
    EUR: number;
  }>({
    BRL: 0,
    USD: 0,
    EUR: 0,
  });
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    totalEarned: string | number;
  } | null>(null);

  const updateTotalEarningsByCurrency = (locations: Location[]) => {
    const earnings = locations.reduce(
      (totals, loc) => {
        if (typeof loc.totalEarned === "string") {
          const valueString = loc.totalEarned as string;
          let value = parseFloat(valueString.replace(/[^\d.-]/g, ""));
          if (!isNaN(value)) {
            if (valueString.startsWith("R$")) {
              totals.BRL += value;
            } else if (valueString.startsWith("$")) {
              totals.USD += value;
            } else if (valueString.startsWith("€")) {
              totals.EUR += value;
            }
          }
        }
        return totals;
      },
      { BRL: 0, USD: 0, EUR: 0 }
    );
    setTotalEarningsByCurrency(earnings);
  };

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
      updateTotalEarningsByCurrency(data);
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
      <h1 className="font-primary text-4xl justify-center text-center text-background my-4">
        Cocômetro
      </h1>
      <div className="flex flex-row items-center justify-center gap-2 lg:gap-6">
        {parseFloat(totalEarningsByCurrency.BRL.toFixed(2)) > 0 && (
          <h1 className="font-primary text-3xl lg:text-4xl justify-center text-center text-background my-4">
            <span>
              R$
              <Odometer
                value={parseFloat(totalEarningsByCurrency.BRL.toFixed(2))}
                format="(.ddd),dd"
              />
            </span>
          </h1>
        )}
        {parseFloat(totalEarningsByCurrency.USD.toFixed(2)) > 0 && (
          <span className=" text-3xl lg:text-4xl">💩</span>
        )}
        {parseFloat(totalEarningsByCurrency.USD.toFixed(2)) > 0 && (
          <>
            <h1 className="font-primary text-3xl lg:text-4xl justify-center text-center text-background my-4">
              <span>
                $
                <Odometer
                  value={parseFloat(totalEarningsByCurrency.USD.toFixed(2))}
                  format="(.ddd),dd"
                />
              </span>
            </h1>
          </>
        )}
        {parseFloat(totalEarningsByCurrency.EUR.toFixed(2)) > 0 && (
          <span className="text-3xl lg:text-4xl">💩</span>
        )}
        {parseFloat(totalEarningsByCurrency.EUR.toFixed(2)) > 0 && (
          <h1 className="font-primary text-3xl lg:text-4xl justify-center text-center text-background my-4">
            <span>
              €
              <Odometer
                value={parseFloat(totalEarningsByCurrency.EUR.toFixed(2))}
                format="(.ddd),dd"
              />
            </span>
          </h1>
        )}
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
