import html2canvas from "html2canvas";
import { useEffect, useRef, useState } from "react";
import ReactGA from "react-ga4";

import {
  FaCheck,
  FaHistory,
  FaMapPin,
  FaMoneyBill,
  FaMoneyBillWave,
  FaPoop,
  FaRegWindowClose,
  FaTrash,
  FaWindowClose,
} from "react-icons/fa";

import { Cocometer } from "../Cocometer";
import { Location } from "../../entities/Location";
import { ComponentType } from "../../entities/ComponentType";

interface CalculatorProps {
  selectedComponent: ComponentType | null;
  setSelectedComponent: (component: ComponentType | null) => void;
}

export function Calculator(props: CalculatorProps) {
  const [salary, setSalary] = useState<string>(""); // Initialize as an empty string
  const [hourStarted, setHourStarted] = useState<string>(""); // Initialize as an empty string
  const [hourEnded, setHourEnded] = useState<string>(""); // Initialize as an empty string
  const [currency, setCurrency] = useState<string>("BRL"); // Initialize as BRL (Brazilian Real)
  const [showResult, setShowResult] = useState(false);
  const [totalEarned, setTotalEarned] = useState<string>("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [displayCalculator, setDisplayCalculator] = useState(false);
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

  const resultRef = useRef<HTMLDivElement>(null);
  ReactGA.initialize(import.meta.env.VITE_GOOGLE_ANALYTICS_ID);

  useEffect(() => {
    updateTotalEarningsByCurrency(locations);
    setLocations(JSON.parse(localStorage.getItem("locations") || "[]"));
  }, []);

  const updateLocations = (index: number) => {
    const existingLocations = JSON.parse(
      localStorage.getItem("locations") || "[]"
    );
    existingLocations.splice(index, 1);
    localStorage.setItem("locations", JSON.stringify(existingLocations));

    setLocations(existingLocations);
    updateTotalEarningsByCurrency(existingLocations);
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

  const handleCalculate = () => {
    setIsCalculating(true); // Set to true when calculation starts

    ReactGA.event({
      category: "Calculate",
      action: "Calculate Poop",
      label: window.location.pathname + window.location.search,
    });

    const earned = calculateIntervalSalary();

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          totalearned: earned,
          timestarted: hourStarted,
          timeended: hourEnded,
          day: new Date().toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
        };

        // Retrieve existing locations from localStorage
        const existingLocations = JSON.parse(
          localStorage.getItem("locations") || "[]"
        );

        // Post the location data as JSON

        let response = fetch(
          "https://handlelocationdata-pzeq65kcvq-uc.a.run.app",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(newLocation),
          }
        )
          .then((response) => response.json())
          .then((data) => {
            newLocation.city = data.city; // Add the city to the location object

            // Add the new location to the array
            existingLocations.push(newLocation);

            // Save the updated array back to localStorage
            localStorage.setItem(
              "locations",
              JSON.stringify(existingLocations)
            );
            setIsCalculating(false); // Set to false when calculation ends
          })
          .catch((error) => {
            // Add the new location to the array
            existingLocations.push(newLocation);

            // Save the updated array back to localStorage
            localStorage.setItem(
              "locations",
              JSON.stringify(existingLocations)
            );
          });

        setIsCalculating(false); // Set to false when calculation ends
        setShowResult(true);
      },
      (error) => {
        setShowResult(true);
        setIsCalculating(false); // Set to false when calculation ends
      }
    );
  };

  const updateTotalEarningsByCurrency = (locations: Location[]) => {
    const earnings = locations.reduce(
      (totals, loc) => {
        if (typeof loc.totalearned === "string") {
          const valueString = loc.totalearned as string;
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

  const downloadImage = () => {
    if (resultRef.current) {
      ReactGA.event({
        category: "Download",
        action: "Download Image",
        label: window.location.pathname + window.location.search,
      });

      html2canvas(resultRef.current).then((canvas) => {
        const link = document.createElement("a");
        link.download = "result.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
      });
    }
  };

  return (
    <div
      className={`gap-2 ${
        props.selectedComponent === ComponentType.Calculator
          ? "flex flex-col w-full mt-4"
          : "hidden"
      }`}
    >
      <div
        className={`flex relative flex-col lg:flex-row items-center mx-auto w-full h-fit gap-4 bg-background py-5 px-2 lg:px-14 rounded-2xl border-4 border-primary shadow-md shadow-secondary`}
      >
        <span className="absolute top-2 right-2 cursor-pointer text-primary text-2xl">
          <FaWindowClose onClick={() => setDisplayCalculator(false)} />
        </span>
        <div className="flex flex-col w-full lg:w-1/2 mx-auto grow">
          {/* Branding */}

          <div className="flex flex-col-reverse lg:flex-row grow mb-6">
            <div className="flex grow  ">
              <div className="flex-grow"></div>
              <span
                className={`${
                  showHistory ? "hidden" : ""
                } text-lg lg:text-xl font-secondary text-primary-dark flex items-center gap-2 hover:font-semibold hover:cursor-pointer hover:text-secondary-light mt-6`}
              >
                <FaMoneyBill />
                <span onClick={() => setShowHistory(!showHistory)}>
                  Meu Contracheque
                </span>
              </span>
              <span
                className={`${
                  !showHistory ? "hidden" : ""
                } text-lg lg:text-xl font-secondary text-primary-dark flex items-center gap-2 hover:font-semibold hover:cursor-pointer hover:text-secondary-light mt-6`}
              >
                <FaRegWindowClose />
                <span onClick={() => setShowHistory(!showHistory)}>
                  Fechar Contracheque
                </span>
              </span>
            </div>
          </div>

          {/* Calculation */}
          <div
            className={`flex flex-col gap-4 w-full ${
              showHistory ? " invisible h-0" : "visible"
            }`}
          >
            {/* Salary */}
            <div className="flex flex-col">
              <span className="text-xl mx-auto text-primary-dark font-semibold font-secondary">
                Salário
              </span>
              <div className="flex items-center border-4 border-primary-dark rounded-lg shadow-lg bg-white">
                <select
                  className="h-full px-4 font-secondary py-3 text-lg bg-white border-none rounded-l-full focus:outline-none text-primary-dark font-semibold text-center"
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="BRL">R$</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
                <input
                  value={salary}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);

                    if (value > 99999) {
                    } else if (value < 1) {
                      setSalary("1");
                    } else {
                      setSalary(e.target.value);
                    }
                  }}
                  type="number"
                  max={99999}
                  min={1}
                  placeholder="Quanto você ganha por mês?"
                  className="w-full px-6 py-3 text-lg font-secondary font-semibold  text-secondary bg-white border-l-4 border-primary-dark rounded-r-full focus:outline-none placeholder-primary placeholder-opacity-80"
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
                  className="w-full px-6 py-3 text-lg text-center font-secondary text-primary-dark font-semibold bg-white border-4 border-primary-dark rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:ring-primary placeholder-secondary-light placeholder-opacity-80"
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
                  className="w-full px-6 py-3 text-lg font-secondary text-center text-primary-dark font-semibold bg-white border-4 border-primary-dark rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-black focus:ring-opacity-50 focus:ring-primary placeholder-secondary-light placeholder-opacity-80"
                />
              </div>
            </div>
            {/* Calculate Button */}
            <button
              onClick={handleCalculate}
              disabled={isCalculating}
              className={`mt-4 px-4 py-2 text-2xl bg-primary font-secondary text-background rounded-lg shadow-lg hover:bg-primary-dark focus:outline-none ${
                isCalculating ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isCalculating ? "Calculando..." : "Calcular"}
            </button>
          </div>
          {/* History */}
          <div
            className={`flex flex-col gap-4 w-full font-typewriter ${
              !showHistory ? " hidden" : "visible"
            } p-4 bg-white border-2 border-gray-300 rounded-lg shadow-md`}
          >
            <h2 className="text-primary-dark text-3xl mx-auto border-b-2 border-gray-300 pb-2">
              Contracheque
            </h2>
            <div className="flex flex-col gap-1 w-full">
              <div className="grid grid-cols-4 text-primary-dark px-4">
                <span className="text-lg col-span-2  lg:col-span-1">Data</span>
                <span className="text-lg">Valor</span>
                <span className="text-lg hidden lg:block">Local</span>
                <span className="text-lg"></span>
              </div>
              {locations && locations.length > 0 ? (
                locations.map((location: Location, index: number) => (
                  <div
                    key={index}
                    className="grid grid-cols-4 items-start gap-2 px-4 min-w-52 rounded-md w-full border-b-2 border-dotted border-secondary-light text-secondary-light relative"
                  >
                    {/* Remove from history */}
                    <span className="text-lg  flex items-center gap-2 absolute top-2 right-2 cursor-pointer hover:text-primary">
                      <FaTrash
                        onClick={() => {
                          updateLocations(index);
                        }}
                      />
                    </span>
                    <span className="text-lg flex items-center gap-2 col-span-2 lg:col-span-1">
                      {location.day}
                    </span>
                    <span className="text-lg flex items-center gap-2 ">
                      {location.totalearned}
                    </span>
                    <span className="text-lg hidden lg:flex items-center gap-2">
                      {" "}
                      {location.city
                        ? location.city
                        : `${location.latitude}, ${location.longitude}`}
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-secondary text-2xl mx-auto flex gap-2 my-6">
                  Nenhum <FaPoop /> ainda
                </span>
              )}
              <div className="grid grid-cols-4 text-primary-dark px-4">
                <span className="text-lg col-span-2 lg:col-span-1">Total</span>
                <span className="text-lg">R${totalEarningsByCurrency.BRL}</span>
                <span className="text-lg hidden lg:block">Local</span>
                <span className="text-lg"></span>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`h-full border-l-2 border-primary-dark my-10 ${
            showResult ? "opacity-100 scale-100" : "opacity-0 scale-95 hidden"
          }`}
        ></div>
        <div
          className={`flex flex-col mx-auto ${showResult ? "grow" : "hidden"}`}
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
            className="mt-4 px-4 w-1/2 mx-auto py-2 text-2xl bg-primary font-secondary text-backgroun rounded-lg shadow-lg hover:bg-primary-dark focus:outline-none text-background"
          >
            Baixar Certificado
          </button>
        </div>
      </div>
    </div>
  );
}
