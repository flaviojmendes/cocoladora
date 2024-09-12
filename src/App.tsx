import React, { useState, useRef } from "react";
import html2canvas from "html2canvas";
import "./App.css";
import ReactGA from "react-ga4";
import GoogleMapComponent, { Location } from "./components/GoogleMapsComponent";

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
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    totalEarned: string | number;
  } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const locations: Location[] = [];

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

  return (
    <div className="bg-secondary-light w-full h-full flex flex-col relative">
      <div className="flex grow">
        <div className="z-10 flex flex-col lg:flex-row items-center mx-auto w-11/12 lg:w-2/3 h-fit gap-4 mt-4 lg:mt-20 bg-background py-10 px-2 lg:px-14 rounded-2xl border-4 border-primary">
          <div className="flex flex-col w-full lg:w-1/2">
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

              {/* Hour Started */}
              <div className="flex flex-col">
                <span className="text-xl mx-auto text-primary-dark font-semibold font-secondary">
                  Que horas começou?
                </span>
                <input
                  type="time"
                  value={hourStarted}
                  onChange={(e) => setHourStarted(e.target.value)}
                  placeholder="Que horas começou?"
                  className="w-full px-6 py-3 text-lg text-center text-primary-dark font-semibold bg-white border-4 border-black rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-black focus:ring-opacity-50 focus:ring-primary placeholder-secondary-light placeholder-opacity-80"
                />
              </div>

              {/* Hour Ended */}
              <div className="flex flex-col">
                <span className="text-xl mx-auto text-primary-dark font-semibold font-secondary">
                  Que horas terminou?
                </span>
                <input
                  type="time"
                  value={hourEnded}
                  onChange={(e) => setHourEnded(e.target.value)}
                  placeholder="Que horas terminou?"
                  className="w-full px-6 py-3 text-lg text-center text-primary-dark font-semibold bg-white border-4 border-black rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-black focus:ring-opacity-50 focus:ring-primary placeholder-secondary-light placeholder-opacity-80"
                />
              </div>

              {/* Calculate Button */}
              <button
                onClick={handleCalculate}
                disabled={isCalculating}
                className={`mt-4 px-4 py-2 text-2xl bg-primary font-secondary text-background text-white rounded-full shadow-lg hover:bg-primary-dark focus:outline-none ${
                  isCalculating ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isCalculating ? "Calculando..." : "Calcular"}
              </button>
            </div>
          </div>
          <div className="h-full border-l-2 border-primary-dark my-10"></div>
          <div className="flex flex-col mx-auto">
            {/* Display Interval Salary */}
            <div
              className="flex flex-col items-center justify-center w-64 h-64 bg-background"
              ref={resultRef}
            >
              {showResult &&
                (totalEarned === "0" || totalEarned === "" ? (
                  <span className="text-4xl text-primary-dark font-semibold font-primary text-center">
                    Preencha os valores pra descobrir quanto você ganhou
                  </span>
                ) : (
                  <>
                    <span className="text-4xl text-primary-dark font-semibold font-primary text-center">
                      Eu recebi{" "}
                      <span className="font-bold text-primary text-5xl smell-animation">
                        {totalEarned}
                      </span>{" "}
                      enquanto meditava no trono.
                    </span>
                    <img src="/caco.png" className="w-32 mt-4" />
                    {/* Download Button */}
                    <button
                      onClick={downloadImage}
                      className="mt-4 px-4 py-2 text-2xl bg-primary font-secondary text-backgroun rounded-full shadow-lg hover:bg-primary-dark focus:outline-none"
                    >
                      Baixar Certificado
                    </button>
                  </>
                ))}
              {!showResult && (
                <span className="text-4xl text-primary-dark font-semibold font-primary text-center">
                  Preencha os valores pra descobrir quanto você ganhou
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex"></div>
      </div>

      {/* Google Map Component */}
      <div className="mt-0 -top-[20%] relative w-full z-0 bg-background bg-opacity-50">
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
