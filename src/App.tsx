import React, { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import "./App.css";
import ReactGA from "react-ga4";
import GoogleMapComponent, { Location } from "./components/GoogleMapsComponent";
import Odometer from "react-odometerjs";
import "odometer/themes/odometer-theme-minimal.css";

function App() {
  ReactGA.initialize(import.meta.env.VITE_GOOGLE_ANALYTICS_ID);
  ReactGA.send({
    hitType: "pageview",
    page: window.location.pathname + window.location.search,
  });

  const [salary, setSalary] = useState<string>(""); // Initialize as an empty string
  const [hourStarted, setHourStarted] = useState<string>(""); // Initialize as an empty string
  const [hourEnded, setHourEnded] = useState<string>(""); // Initialize as an empty string
  const [currency, setCurrency] = useState<string>("BRL"); // Initialize as BRL (Brazilian Real)
  const [showResult, setShowResult] = useState(false);
  const [totalEarned, setTotalEarned] = useState<string>("");
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
  const [isCalculating, setIsCalculating] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

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

  const handleCalculate = () => {
    setIsCalculating(true); // Set to true when calculation starts
    const earned = calculateIntervalSalary();

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          totalEarned: earned,
        };
        setLocation(newLocation);
        console.log("Location: ", newLocation);

        // Post the location data as JSON
        fetch("https://handlelocationdata-k2ngx5ghxq-uc.a.run.app", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newLocation),
        })
          .then((response) => response.json())
          .then((data) => {
            console.log("Success:", data);
            setIsCalculating(false); // Set to false when calculation ends
          })
          .catch((error) => {
            console.error("Error:", error);
            setIsCalculating(false); // Set to false when calculation ends
          });

        setShowResult(true);
        fetchData();
      },
      (error) => {
        console.error("Error getting geolocation: ", error);
        setShowResult(true);
        setIsCalculating(false); // Set to false when calculation ends
      }
    );
  };

  const calculateIntervalSalary = () => {
    if (!salary || !hourStarted || !hourEnded) return 0;

    const monthlyWorkingHours = 44 * 4; // 44 hours per week * 4 weeks
    const hourlyRate = parseFloat(salary) / monthlyWorkingHours;

    const [startHour, startMinute] = hourStarted.split(":").map(Number);
    const [endHour, endMinute] = hourEnded.split(":").map(Number);

    const startTime = new Date();
    startTime.setHours(startHour, startMinute, 0);

    const endTime = new Date();
    endTime.setHours(endHour, endMinute, 0);

    const intervalInHours =
      (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    const intervalSalary = intervalInHours * hourlyRate;

    const formattedEarnings = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(Number(intervalSalary.toFixed(2)));

    setTotalEarned(formattedEarnings);
    return formattedEarnings;
  };

  const downloadImage = () => {
    if (resultRef.current) {
      html2canvas(resultRef.current).then((canvas) => {
        const link = document.createElement("a");
        link.download = "result.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
      });

      ReactGA.send({
        hitType: "download",
        page: window.location.pathname + window.location.search,
      });
    }
  };

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
        <div className="flex flex-col lg:flex-row items-center mx-auto w-11/12 lg:w-4/5 h-fit gap-4  bg-background py-5 px-2 lg:px-14 rounded-2xl border-4 border-primary shadow-md shadow-secondary border-t-0 rounded-t-none">
          <div className="flex flex-col w-full lg:w-1/2 mx-auto transition-all grow duration-1000">
            {/* Branding */}
            <div className="flex mx-auto items-end mb-6">
              <img src="/caco.png" className="w-24 lg:w-32" />
              <h1 className="text-4xl lg:text-6xl font-bold ml-4 font-primary text-primary-dark">
                Cocoladora
              </h1>
            </div>

            {/* Calculation */}
            <div className="flex flex-col gap-4 w-full">
              {/* Salary */}
              <div className="flex flex-col">
                <span className="text-xl mx-auto text-primary-dark font-semibold font-secondary">
                  Salário
                </span>
                <div className="flex items-center border-4 border-primary-dark rounded-full shadow-lg bg-white">
                  <select
                    className="h-full px-4 py-3 text-lg bg-white border-none rounded-l-full focus:outline-none text-primary-dark font-semibold text-center"
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="BRL">R$</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                  <input
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    type="number"
                    placeholder="Quanto você ganha por mês?"
                    className="w-full px-6 py-3 text-lg text-gray-700 bg-white border-l-4 border-primary-dark rounded-r-full focus:outline-none placeholder-primary placeholder-opacity-80"
                  />
                </div>
              </div>

              <div className="flex flex-col lg:flex-row w-full lg:gap-4">
                {/* Hour Started */}
                <div className="flex flex-col grow">
                  <span className="text-xl mx-auto text-primary-dark font-semibold font-secondary">
                    Que horas começou o 💩?
                  </span>
                  <input
                    type="time"
                    value={hourStarted}
                    onChange={(e) => setHourStarted(e.target.value)}
                    placeholder="Que horas começou?"
                    className="w-full px-6 py-3 text-lg text-center text-primary-dark font-semibold bg-white border-4 border-primary-dark rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:ring-primary placeholder-secondary-light placeholder-opacity-80"
                  />
                </div>

                {/* Hour Ended */}
                <div className="flex flex-col grow">
                  <span className="text-xl mx-auto text-primary-dark font-semibold font-secondary">
                    Que horas terminou o 💩?
                  </span>
                  <input
                    type="time"
                    value={hourEnded}
                    onChange={(e) => setHourEnded(e.target.value)}
                    placeholder="Que horas terminou?"
                    className="w-full px-6 py-3 text-lg text-center text-primary-dark font-semibold bg-white border-4 border-primary-dark rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-black focus:ring-opacity-50 focus:ring-primary placeholder-secondary-light placeholder-opacity-80"
                  />
                </div>
              </div>
              {/* Calculate Button */}
              <button
                onClick={handleCalculate}
                disabled={isCalculating}
                className={`mt-4 px-4 py-2 text-2xl bg-primary font-secondary text-background rounded-full shadow-lg hover:bg-primary-dark focus:outline-none ${
                  isCalculating ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isCalculating ? "Calculando..." : "Calcular"}
              </button>
            </div>
          </div>

          <div className="h-full border-l-2 border-primary-dark my-10"></div>
          <div
            className={`flex flex-col mx-auto transition-all duration-1000 ${
              showResult
                ? "opacity-100 scale-100 grow"
                : "opacity-0 scale-95 hidden"
            }`}
          >
            {/* Display Interval Salary */}
            <div
              className="flex mx-auto flex-col items-center justify-center w-64 h-64 bg-background py-4"
              ref={resultRef}
            >
              <span className="text-4xl text-primary-dark font-semibold font-primary text-center">
                Eu recebi{" "}
                <span className="font-bold text-primary text-5xl ">
                  {totalEarned}
                </span>{" "}
                enquanto meditava no trono.
              </span>
              <img src="/caco.png" className="w-32 mt-4" />
            </div>
            {/* Download Button */}
            <button
              onClick={downloadImage}
              className="mt-4 px-4 w-1/2 mx-auto py-2 text-2xl bg-primary font-secondary text-backgroun rounded-full shadow-lg hover:bg-primary-dark focus:outline-none text-background"
            >
              Baixar Certificado
            </button>
          </div>
        </div>
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
        <GoogleMapComponent fetchData={fetchData} locations={locations} />
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
