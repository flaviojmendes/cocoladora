import html2canvas from "html2canvas";
import React, { useEffect, useRef, useState } from "react";
import ReactGA from "react-ga4";

import {
  FaCheck,
  FaCog,
  FaDownload,
  FaHistory,
  FaMoneyBillWave,
  FaPlay,
  FaPoop,
  FaShareAlt,
  FaStop,
  FaTimes,
  FaTrash,
} from "react-icons/fa";

import { Location } from "../../entities/Location";
import { ComponentType } from "../../entities/ComponentType";
import { translate } from "../../languages/translator";
import { SalaryConfig } from "../../entities/SalaryConfig";
import { StorageService } from "../../services/storage";

interface CalculatorProps {
  selectedComponent: ComponentType | null;
  setSelectedComponent: (component: ComponentType | null) => void;
  onLocationsUpdated?: (locations: Location[]) => void;
}

export function Calculator({
  selectedComponent,
  setSelectedComponent,
  onLocationsUpdated,
}: CalculatorProps) {
  const [salary, setSalary] = useState<string>("5000");
  const [currency, setCurrency] = useState<string>("BRL");
  const [hourStarted, setHourStarted] = useState<string>("14:00");
  const [hourEnded, setHourEnded] = useState<string>("14:20");
  const [salaryConfig, setSalaryConfig] = useState<SalaryConfig>(() =>
    StorageService.getSalaryConfig()
  );
  const [isSalaryConfigOpen, setIsSalaryConfigOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [totalEarned, setTotalEarned] = useState<string>("");
  const [earnedNumeric, setEarnedNumeric] = useState<number>(0);
  const [sessionMinutes, setSessionMinutes] = useState<number>(20);
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    StorageService.getLocations().then((data) => setLocations(data));
  }, []);

  // Live Timer Mode
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerStartTimestamp, setTimerStartTimestamp] = useState<Date | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);

  // Sync salary config changes to storage
  const handleUpdateSalaryConfig = (newConfig: SalaryConfig) => {
    setSalaryConfig(newConfig);
    StorageService.saveSalaryConfig(newConfig);
  };

  // Live timer interval
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const getHourlyRate = (): number => {
    const s = parseFloat(salary) || 0;
    const hours = salaryConfig.hoursPerWeek || 40;
    if (salaryConfig.periodicity === "hourly") {
      return s;
    } else if (salaryConfig.periodicity === "monthly") {
      return s / (hours * 4.33);
    } else if (salaryConfig.periodicity === "yearly") {
      return s / (hours * 52);
    }
    return s / (hours * 4.33);
  };

  const getCurrencySymbol = (cur: string) => {
    switch (cur) {
      case "BRL":
        return "R$";
      case "EUR":
        return "€";
      case "USD":
      default:
        return "$";
    }
  };

  const formatMoney = (amount: number, cur: string) => {
    return new Intl.NumberFormat(cur === "BRL" ? "pt-BR" : "en-US", {
      style: "currency",
      currency: cur,
    }).format(amount);
  };

  const calculateEarnedAmount = (minutes: number) => {
    const hourlyRate = getHourlyRate();
    const hours = minutes / 60;
    const val = hours * hourlyRate;
    return Math.max(0, val);
  };

  // Handle Manual Calculation
  const handleCalculateManual = () => {
    if (!salary || !hourStarted || !hourEnded) return;

    const [startH, startM] = hourStarted.split(":").map(Number);
    const [endH, endM] = hourEnded.split(":").map(Number);

    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;

    // Handle crossing midnight
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }

    const duration = Math.max(1, endMinutes - startMinutes);
    const earnedVal = calculateEarnedAmount(duration);
    const formatted = formatMoney(earnedVal, currency);

    setSessionMinutes(duration);
    setEarnedNumeric(earnedVal);
    setTotalEarned(formatted);
    setShowResult(true);

    saveSessionRecord(formatted, hourStarted, hourEnded);
  };

  // Start Live Timer
  const handleStartTimer = () => {
    const now = new Date();
    setTimerStartTimestamp(now);
    setTimerSeconds(0);
    setTimerRunning(true);
    setShowResult(false);
  };

  // Stop Live Timer and calculate
  const handleStopTimer = () => {
    setTimerRunning(false);
    const now = new Date();
    const start = timerStartTimestamp || now;

    const startH = String(start.getHours()).padStart(2, "0");
    const startM = String(start.getMinutes()).padStart(2, "0");
    const endH = String(now.getHours()).padStart(2, "0");
    const endM = String(now.getMinutes()).padStart(2, "0");

    const durationMinutes = Math.max(1, Math.round(timerSeconds / 60));
    const earnedVal = calculateEarnedAmount(durationMinutes);
    const formatted = formatMoney(earnedVal, currency);

    setSessionMinutes(durationMinutes);
    setEarnedNumeric(earnedVal);
    setTotalEarned(formatted);
    setShowResult(true);

    saveSessionRecord(formatted, `${startH}:${startM}`, `${endH}:${endM}`);
  };

  const saveSessionRecord = async (formattedEarnings: string, start: string, end: string) => {
    const saveWithCoords = async (lat: number, lng: number) => {
      const newRecord: Location = {
        latitude: lat,
        longitude: lng,
        city: "Meu Trono",
        totalearned: formattedEarnings,
        timestarted: start,
        timeended: end,
        day: new Date().toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
      };
      const updated = await StorageService.addLocation(newRecord);
      setLocations(updated);
      onLocationsUpdated?.(updated);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => saveWithCoords(pos.coords.latitude, pos.coords.longitude),
        () => saveWithCoords(-23.5505, -46.6333)
      );
    } else {
      saveWithCoords(-23.5505, -46.6333);
    }
  };

  const handleDeleteLocation = async (index: number) => {
    const target = locations[index];
    const updated = await StorageService.removeLocation(target?.id, index);
    setLocations(updated);
    onLocationsUpdated?.(updated);
  };

  const handleClearHistory = async () => {
    if (window.confirm(translate("confirmClear"))) {
      const updated = await StorageService.clearLocations();
      setLocations(updated);
      onLocationsUpdated?.(updated);
    }
  };

  const downloadCertificate = () => {
    if (!resultRef.current) return;
    try {
      ReactGA.event({
        category: "Download",
        action: "Download Certificate",
        label: window.location.pathname,
      });
    } catch {}

    html2canvas(resultRef.current, {
      useCORS: true,
      scale: 2,
      backgroundColor: "#fcf9ea",
    }).then((canvas) => {
      const link = document.createElement("a");
      link.download = `cocoladora-certificado-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
  };

  const shareCertificate = async () => {
    if (navigator.share && resultRef.current) {
      try {
        const canvas = await html2canvas(resultRef.current, {
          useCORS: true,
          scale: 2,
          backgroundColor: "#fcf9ea",
        });
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], "meu-certificado-cocoladora.png", {
              type: "image/png",
            });
            await navigator.share({
              title: "Cocoladora - Meu Faturamento no Trono",
              text: `Faturei ${totalEarned} meditando no trono da empresa! Calcule o seu no Cocoladora.`,
              files: [file],
            });
          }
        });
      } catch (err) {
        console.error("Share error:", err);
      }
    } else {
      downloadCertificate();
    }
  };

  if (selectedComponent !== ComponentType.Calculator) {
    return null;
  }

  // Calculate live ticker earned
  const liveEarnedNow = calculateEarnedAmount(timerSeconds / 60);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 mt-6">
      <div className="relative bg-background text-secondary rounded-2xl border-4 border-primary p-6 sm:p-8 shadow-xl">
        {/* Close Button */}
        <button
          onClick={() => setSelectedComponent(null)}
          aria-label={translate("close")}
          className="absolute top-4 right-4 text-primary hover:text-primary-dark transition-colors p-2 rounded-lg hover:bg-background-dark focus:outline-none"
        >
          <FaTimes size={24} />
        </button>

        {/* Top Header & Paycheck Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b-2 border-primary/20 mb-6 gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚽</span>
            <h2 className="font-primary text-3xl sm:text-4xl text-primary font-bold">
              {translate("calculatePoop")} 💩
            </h2>
          </div>

          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 font-secondary text-lg sm:text-xl text-primary-dark hover:text-primary bg-background-dark/80 px-4 py-2 rounded-lg border-2 border-primary/30 transition-all self-start sm:self-auto"
          >
            <FaHistory />
            <span>
              {showHistory ? translate("closePaycheck") : translate("myPaycheck")}
            </span>
            <span className="bg-primary text-background text-xs px-2 py-0.5 rounded-full font-typewriter">
              {locations.length}
            </span>
          </button>
        </div>

        {/* Main Content: Split into Calculator vs Paycheck */}
        {showHistory ? (
          /* Paycheck History View */
          <div className="flex flex-col gap-4 font-typewriter">
            <div className="flex items-center justify-between">
              <h3 className="font-primary text-3xl text-primary-dark">
                {translate("paycheck")}
              </h3>
              {locations.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition-colors"
                >
                  <FaTrash size={12} />
                  <span>{translate("clearHistory")}</span>
                </button>
              )}
            </div>

            {locations.length === 0 ? (
              <div className="text-center py-12 bg-background-dark/50 rounded-xl border-2 border-dashed border-primary/30">
                <FaPoop className="text-primary/40 text-5xl mx-auto mb-3" />
                <p className="font-secondary text-xl text-secondary-light">
                  {translate("noHistoryYet")}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-xl border-2 border-primary/20 shadow-inner p-4">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-primary/30 text-primary-dark font-bold text-sm sm:text-base">
                      <th className="py-2 px-3">Data</th>
                      <th className="py-2 px-3">Horário</th>
                      <th className="py-2 px-3">Local</th>
                      <th className="py-2 px-3 text-right">Faturamento</th>
                      <th className="py-2 px-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-secondary text-sm sm:text-base">
                    {locations.map((loc, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/50 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap">{loc.day || "-"}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {loc.timestarted && loc.timeended
                            ? `${loc.timestarted} - ${loc.timeended}`
                            : "-"}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="truncate block max-w-[160px] sm:max-w-xs">
                            {loc.city || "Throne Room"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-primary whitespace-nowrap">
                          {loc.totalearned}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleDeleteLocation(idx)}
                            aria-label="Delete entry"
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                          >
                            <FaTrash size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Calculator View */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 flex flex-col gap-5">
              {/* Mode Toggle: Manual Time vs Live Stopwatch */}
              <div className="flex bg-background-dark p-1.5 rounded-xl border-2 border-primary/20 gap-2">
                <button
                  type="button"
                  onClick={() => setIsLiveMode(false)}
                  className={`flex-1 py-2 px-4 rounded-lg font-secondary text-lg transition-all ${
                    !isLiveMode
                      ? "bg-primary text-background font-bold shadow-md"
                      : "text-secondary hover:text-primary"
                  }`}
                >
                  {translate("manualTime")}
                </button>
                <button
                  type="button"
                  onClick={() => setIsLiveMode(true)}
                  className={`flex-1 py-2 px-4 rounded-lg font-secondary text-lg transition-all flex items-center justify-center gap-2 ${
                    isLiveMode
                      ? "bg-primary text-background font-bold shadow-md"
                      : "text-secondary hover:text-primary"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  {translate("liveTimer")}
                </button>
              </div>

              {/* Salary Input Card */}
              <div className="bg-white rounded-xl p-4 border-2 border-primary/30 shadow-sm flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="salaryInput" className="font-secondary text-primary-dark font-semibold text-lg">
                    {salaryConfig.periodicity === "hourly"
                      ? translate("howMuchHour")
                      : salaryConfig.periodicity === "yearly"
                      ? translate("howMuchYear")
                      : translate("howMuchMonth")}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsSalaryConfigOpen(!isSalaryConfigOpen)}
                    className="text-primary hover:text-primary-dark p-1.5 rounded-lg hover:bg-background-dark transition-colors"
                    title={translate("salaryConfig")}
                  >
                    <FaCog size={20} />
                  </button>
                </div>

                <div className="flex items-center rounded-lg border-2 border-primary-dark overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    aria-label="Currency"
                    className="bg-background-dark font-secondary text-lg font-bold text-primary-dark py-3 px-3 border-r-2 border-primary-dark focus:outline-none cursor-pointer"
                  >
                    <option value="BRL">R$ (BRL)</option>
                    <option value="USD">$ (USD)</option>
                    <option value="EUR">€ (EUR)</option>
                  </select>

                  <input
                    id="salaryInput"
                    type="number"
                    min="1"
                    max="9999999"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    placeholder="5000"
                    className="w-full py-3 px-4 text-xl font-typewriter text-secondary focus:outline-none"
                  />
                </div>

                {/* Collapsible Salary Configuration */}
                {isSalaryConfigOpen && (
                  <div className="mt-3 pt-3 border-t border-primary/20 flex flex-col gap-3 bg-background-dark/50 p-3 rounded-lg">
                    <span className="font-secondary text-primary font-bold text-base">
                      {translate("salaryConfig")}
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-secondary text-sm text-secondary-light mb-1">
                          {translate("mySalary")}
                        </label>
                        <div className="flex rounded-lg overflow-hidden border border-primary/30">
                          {(["hourly", "monthly", "yearly"] as const).map((period) => (
                            <button
                              key={period}
                              type="button"
                              onClick={() =>
                                handleUpdateSalaryConfig({
                                  ...salaryConfig,
                                  periodicity: period,
                                })
                              }
                              className={`flex-1 py-1.5 px-2 text-xs sm:text-sm font-secondary transition-colors ${
                                salaryConfig.periodicity === period
                                  ? "bg-primary text-background font-bold"
                                  : "bg-white text-secondary hover:bg-amber-50"
                              }`}
                            >
                              {translate(period)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block font-secondary text-sm text-secondary-light mb-1">
                          {translate("hoursWeek")}
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="168"
                          value={salaryConfig.hoursPerWeek}
                          onChange={(e) =>
                            handleUpdateSalaryConfig({
                              ...salaryConfig,
                              hoursPerWeek: parseInt(e.target.value, 10) || 40,
                            })
                          }
                          className="w-full py-1.5 px-3 rounded-lg border border-primary/30 text-sm font-typewriter text-center focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Mode: Manual Time vs Live Stopwatch */}
              {!isLiveMode ? (
                <div className="bg-white rounded-xl p-4 border-2 border-primary/30 shadow-sm flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-secondary text-primary-dark font-semibold text-lg mb-1">
                        {translate("whatTimeStartedPoop")}
                      </label>
                      <input
                        type="time"
                        value={hourStarted}
                        onChange={(e) => setHourStarted(e.target.value)}
                        className="w-full py-2.5 px-3 rounded-lg border-2 border-primary-dark font-typewriter text-lg text-center text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block font-secondary text-primary-dark font-semibold text-lg mb-1">
                        {translate("whatTimeEndedPoop")}
                      </label>
                      <input
                        type="time"
                        value={hourEnded}
                        onChange={(e) => setHourEnded(e.target.value)}
                        className="w-full py-2.5 px-3 rounded-lg border-2 border-primary-dark font-typewriter text-lg text-center text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCalculateManual}
                    className="w-full py-3.5 px-6 rounded-xl font-secondary text-2xl font-bold bg-primary hover:bg-primary-dark text-background shadow-lg transition-transform active:translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-primary/40 flex items-center justify-center gap-2"
                  >
                    <span>{translate("calculate")}</span>
                    <FaMoneyBillWave />
                  </button>
                </div>
              ) : (
                /* Live Stopwatch Mode */
                <div className="bg-white rounded-xl p-6 border-2 border-primary/30 shadow-sm flex flex-col items-center gap-4 text-center">
                  <div className="font-typewriter text-5xl sm:text-6xl text-primary font-bold tracking-wider py-2">
                    {String(Math.floor(timerSeconds / 60)).padStart(2, "0")}:
                    {String(timerSeconds % 60).padStart(2, "0")}
                  </div>

                  {timerRunning && (
                    <div className="bg-amber-50 px-4 py-2 rounded-lg border border-amber-200 text-primary-dark font-secondary text-lg animate-pulse">
                      {translate("earnedSoFar")}{" "}
                      <span className="font-bold text-primary font-typewriter">
                        {formatMoney(liveEarnedNow, currency)}
                      </span>
                    </div>
                  )}

                  {!timerRunning ? (
                    <button
                      type="button"
                      onClick={handleStartTimer}
                      className="w-full py-4 px-6 rounded-xl font-secondary text-2xl font-bold bg-green-700 hover:bg-green-800 text-white shadow-lg transition-transform active:translate-y-0.5 flex items-center justify-center gap-3"
                    >
                      <FaPlay size={20} />
                      <span>{translate("startTimer")}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopTimer}
                      className="w-full py-4 px-6 rounded-xl font-secondary text-2xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg transition-transform active:translate-y-0.5 flex items-center justify-center gap-3"
                    >
                      <FaStop size={20} />
                      <span>{translate("stopTimer")}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Result & Shareable Certificate */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              {showResult ? (
                <div className="w-full flex flex-col items-center">
                  {/* The Certificate Canvas */}
                  <div
                    ref={resultRef}
                    className="w-full max-w-sm bg-background border-4 border-primary rounded-2xl p-6 shadow-xl flex flex-col items-center text-center relative overflow-hidden"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <img src="/caco.webp" alt="Mascot" className="w-12 h-12" />
                    </div>

                    <span className="font-primary text-xl text-primary tracking-wide mb-1">
                      {translate("officialCertificate")}
                    </span>

                    <div className="h-0.5 w-3/4 bg-primary/20 my-2" />

                    <p className="font-secondary text-lg text-secondary-light">
                      {translate("iveEarned")}
                    </p>

                    <p className="font-primary text-4xl sm:text-5xl text-primary font-bold my-2 scale-105">
                      {totalEarned}
                    </p>

                    <p className="font-secondary text-base text-secondary-light">
                      {translate("whileMeditating")}
                    </p>

                    <div className="mt-4 pt-3 border-t border-primary/20 w-full flex items-center justify-between text-xs font-typewriter text-secondary-light">
                      <span>{new Date().toLocaleDateString()}</span>
                      <span className="font-bold text-primary">cocoladora.com</span>
                    </div>
                  </div>

                  {/* Export Buttons */}
                  <div className="w-full max-w-sm grid grid-cols-2 gap-3 mt-4">
                    <button
                      type="button"
                      onClick={downloadCertificate}
                      className="py-2.5 px-3 rounded-xl font-secondary text-lg font-bold bg-primary hover:bg-primary-dark text-background shadow transition-colors flex items-center justify-center gap-2"
                    >
                      <FaDownload size={16} />
                      <span>{translate("downloadCertificate")}</span>
                    </button>

                    <button
                      type="button"
                      onClick={shareCertificate}
                      className="py-2.5 px-3 rounded-xl font-secondary text-lg font-bold bg-secondary hover:bg-secondary-light text-background shadow transition-colors flex items-center justify-center gap-2"
                    >
                      <FaShareAlt size={16} />
                      <span>{translate("shareCertificate")}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="hidden lg:flex flex-col items-center justify-center p-8 bg-background-dark/60 rounded-2xl border-2 border-dashed border-primary/30 text-center w-full min-h-[340px]">
                  <img src="/caco.webp" alt="Mascot" className="w-24 h-24 mb-4 opacity-75" />
                  <p className="font-secondary text-xl text-primary-dark font-semibold">
                    Preencha seu salário e horário para emitir seu certificado de remuneração!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
