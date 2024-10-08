import html2canvas from "html2canvas";
import { useEffect, useRef, useState } from "react";
import ReactGA from "react-ga4";

import {
  FaCheck,
  FaCog,
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
import { translate } from "../../languages/translator";
import { useLocalStorage } from "@uidotdev/usehooks";
import { SalaryConfig } from "../../entities/SalaryConfig";

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
  const [isSalaryConfigOpen, setIsSalaryConfigOpen] = useState(false);
  const [displayCalculator, setDisplayCalculator] = useState(false);
  const [salaryConfig, setSalaryConfig] = useLocalStorage<SalaryConfig>(
    "salaryConfig",
    {
      periodicity: "monthly",
      hoursPerWeek: 44,
    }
  );
  const [periodicity, setPeriodicity] = useState("monthly"); // Default value

  const [locations, setLocations] = useLocalStorage<Location[]>(
    "locations",
    []
  );
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
  }, []);

  const updateLocations = (index: number) => {
    const existingLocations = locations;
    existingLocations.splice(index, 1);
    setLocations(existingLocations);
    updateTotalEarningsByCurrency(existingLocations);
  };

  const calculateIntervalSalary = () => {
    if (!salary || !hourStarted || !hourEnded) return 0;

    let hourlyRate = 0;

    if (salaryConfig.periodicity === "hourly") {
      hourlyRate = parseFloat(salary);
    } else if (salaryConfig.periodicity === "monthly") {
      hourlyRate = parseFloat(salary) / (salaryConfig.hoursPerWeek * 4);
    } else if (salaryConfig.periodicity === "yearly") {
      hourlyRate = parseFloat(salary) / (salaryConfig.hoursPerWeek * 4 * 12);
    }

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

  // Add this function to handle sharing
  const shareImage = async () => {
    if (navigator.share && resultRef.current) {
      try {
        ReactGA.event({
          category: "Share",
          action: "Share Image",
          label: window.location.pathname + window.location.search,
        });
        const canvas = await html2canvas(resultRef.current, {
          useCORS: true,
          scale: 1,
        });
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], "result.png", { type: "image/png" });
            await navigator.share({
              title: "My Earnings",
              text: "Check out my earnings while meditating!",
              files: [file],
            });
          }
        });
      } catch (error) {
        console.error("Error sharing the image:", error);
      }
    } else {
      alert("Web Share API is not supported in your browser.");
    }
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
        const existingLocations = locations;

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
            setLocations(existingLocations);
            setIsCalculating(false); // Set to false when calculation ends
          })
          .catch((error) => {
            // Add the new location to the array
            existingLocations.push(newLocation);

            // Save the updated array back to localStorage
            setLocations(existingLocations);
          });

        setIsCalculating(false); // Set to false when calculation ends
        setShowResult(true);
      },
      (error) => {
        const newLocation: Location = {
          latitude: 0,
          longitude: 0,
          city: "Unknown",
          totalearned: earned,
          timestarted: hourStarted,
          timeended: hourEnded,
          day: new Date().toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
        };

        const existingLocations = locations;
        existingLocations.push(newLocation);

        // Save the updated array back to localStorage
        setLocations(existingLocations);
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

      html2canvas(resultRef.current, {
        useCORS: true,
        scale: 1,
      }).then((canvas) => {
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
                  {translate("myPaycheck")}
                </span>
              </span>
              <span
                className={`${
                  !showHistory ? "hidden" : ""
                } text-lg lg:text-xl font-secondary text-primary-dark flex items-center gap-2 hover:font-semibold hover:cursor-pointer hover:text-secondary-light mt-6`}
              >
                <FaRegWindowClose />
                <span onClick={() => setShowHistory(!showHistory)}>
                  {translate("closePaycheck")}
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
                {translate("salary")}
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
                  placeholder={
                    salaryConfig.periodicity === "hourly"
                      ? translate("howMuchHour")
                      : salaryConfig.periodicity === "monthly"
                      ? translate("howMuchMonth")
                      : translate("howMuchYear")
                  }
                  className="w-full px-6 py-3 text-lg font-secondary font-semibold text-secondary bg-white border-l-4 border-primary-dark rounded-r-full focus:outline-none placeholder-primary placeholder-opacity-80"
                />
                <button
                  className="ml-2 p-2 text-primary-dark"
                  onClick={() => setIsSalaryConfigOpen(!isSalaryConfigOpen)}
                >
                  <FaCog size={24} />
                </button>
              </div>
              {/* Salary Config */}
              <div
                className={`flex flex-col bg-background-dark p-4 rounded-b-md transition-all duration-300 ${
                  isSalaryConfigOpen
                    ? "max-h-screen opacity-100"
                    : "max-h-0 opacity-0 overflow-hidden"
                }`}
              >
                <h2 className="font-secondary text-primary-dark mx-auto text-xl">
                  {translate("salaryConfig")}
                </h2>
                <div className="flex gap-2 flex-col lg:flex-row">
                  <div className="flex flex-col text-center grow">
                    <label
                      htmlFor="hoursPerWeek"
                      className="font-secondary text-primary-dark"
                    >
                      {translate("hoursWeek")}
                    </label>
                    <input
                      id="hoursPerWeek"
                      type="number"
                      value={salaryConfig.hoursPerWeek}
                      onChange={(e) =>
                        setSalaryConfig({
                          ...salaryConfig,
                          hoursPerWeek: parseInt(e.target.value, 10),
                        })
                      }
                      className="h-full px-4 font-secondary py-3 text-lg bg-white rounded-md border-4 border-primary-dark focus:outline-none text-primary-dark font-semibold text-center"
                    />
                  </div>
                  <div className="flex flex-col items-center grow text-primary-dark">
                    <label htmlFor="mySalary" className="font-secondary ">
                      {translate("mySalary")}
                    </label>
                    <div className="flex items-center">
                      <button
                        className={`bg-background p-2  border-4 border-primary-dark border-r-0 rounded-l-md ${
                          salaryConfig.periodicity === "hourly"
                            ? "bg-primary-dark text-background "
                            : ""
                        }`}
                        onClick={() =>
                          setSalaryConfig({
                            ...salaryConfig,
                            periodicity: "hourly",
                          })
                        }
                      >
                        {translate("hourly")}
                      </button>
                      <button
                        className={`bg-background p-2  border-4 border-primary-dark ${
                          salaryConfig.periodicity === "monthly"
                            ? "bg-primary-dark text-background "
                            : ""
                        }`}
                        onClick={() =>
                          setSalaryConfig({
                            ...salaryConfig,
                            periodicity: "monthly",
                          })
                        }
                      >
                        {translate("monthly")}
                      </button>
                      <button
                        className={`bg-background p-2  border-4 border-primary-dark border-l-0 rounded-r-md ${
                          salaryConfig.periodicity === "yearly"
                            ? "bg-primary-dark text-background "
                            : ""
                        }`}
                        onClick={() =>
                          setSalaryConfig({
                            ...salaryConfig,
                            periodicity: "yearly",
                          })
                        }
                      >
                        {translate("yearly")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row w-full lg:gap-4">
              {/* Hour Started */}
              <div className="flex flex-col grow">
                <span className="text-xl mx-auto text-primary-dark font-semibold font-secondary">
                  {translate("whatTimeStartedPoop")}
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
                  {translate("whatTimeEndedPoop")}
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
              {isCalculating ? "Calculando..." : translate("calculate")}
            </button>
          </div>
          {/* History */}
          <div
            className={`flex flex-col gap-4 w-full font-typewriter ${
              !showHistory ? " hidden" : "visible"
            } p-4 bg-white border-2 border-gray-300 rounded-lg shadow-md`}
          >
            <h2 className="text-primary-dark text-3xl mx-auto border-b-2 border-gray-300 pb-2">
              {translate("paycheck")}
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
                <span className="text-lg">
                  R${totalEarningsByCurrency.BRL.toFixed(2)}
                </span>
                <span className="text-lg hidden lg:block"></span>
                <span className="text-lg"></span>
              </div>
              <div className="grid grid-cols-4 text-primary-dark px-4">
                <span className="text-lg col-span-2 lg:col-span-1">Total</span>
                <span className="text-lg">
                  $${totalEarningsByCurrency.USD.toFixed(2)}
                </span>
                <span className="text-lg hidden lg:block"></span>
                <span className="text-lg"></span>
              </div>
              <div className="grid grid-cols-4 text-primary-dark px-4">
                <span className="text-lg col-span-2 lg:col-span-1">Total</span>
                <span className="text-lg">
                  €${totalEarningsByCurrency.EUR.toFixed(2)}
                </span>
                <span className="text-lg hidden lg:block"></span>
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
            style={{
              padding: "20px",
              backgroundColor: "",
              width: "auto", // Ensure the width is 100%
              height: "auto", // Ensure the height is auto
            }}
          >
            <span className="text-4xl text-primary-dark font-semibold font-primary text-center">
              {translate("iveEarned")}{" "}
              <span className="font-bold text-primary text-4xl ">
                {totalEarned}
              </span>{" "}
              {translate("whileMeditating")}
            </span>

            <img src="/caco.webp" className="w-32 mt-4" />
            <span className="text-xl text-primary-dark font-semibold font-secondary text-center">
              cocoladora.com
            </span>
          </div>
          <div className="flex gap-2">
            {/* Download Button */}
            <button
              onClick={downloadImage}
              className="mt-4 px-4 w-1/2 mx-auto py-2 text-2xl bg-primary font-secondary text-backgroun rounded-lg shadow-lg hover:bg-primary-dark focus:outline-none text-background"
            >
              {translate("downloadCertificate")}
            </button>
            {/* Share Button */}
            <button
              onClick={shareImage}
              className="mt-4 px-4 w-1/2 mx-auto py-2 text-2xl lg:hidden bg-primary font-secondary text-background rounded-lg shadow-lg hover:bg-primary-dark focus:outline-none"
            >
              {translate("shareCertificate")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
