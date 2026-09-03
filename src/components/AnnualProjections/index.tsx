import React, { useState } from "react";
import {
  FaChartLine,
  FaCalendarAlt,
  FaUmbrellaBeach,
  FaCoins,
  FaHourglassHalf,
  FaInfoCircle,
} from "react-icons/fa";
import { translate } from "../../languages/translator";
import { AudioService } from "../../utils/audio";
import { AchievementService } from "../../utils/achievements";

export function AnnualProjections() {
  const [dailyMinutes, setDailyMinutes] = useState<number>(20);
  const [daysPerWeek, setDaysPerWeek] = useState<number>(5);
  const [monthlySalary, setMonthlySalary] = useState<number>(5000);
  const [currency, setCurrency] = useState<string>("BRL");

  // Calculations
  const workingWeeksPerYear = 48; // Taking holidays & standard vacation into account
  const totalAnnualDays = daysPerWeek * workingWeeksPerYear;
  const totalAnnualMinutes = dailyMinutes * totalAnnualDays;
  const totalAnnualHours = totalAnnualMinutes / 60;

  // Assuming standard 40h/week (160h/month)
  const hourlyRate = monthlySalary / 160;
  const annualEarnings = totalAnnualHours * hourlyRate;

  // Days equivalent of 8-hour workdays spent in the throne
  const equivalentWorkDays = (totalAnnualHours / 8).toFixed(1);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : "en-US", {
      style: "currency",
      currency: currency,
    }).format(val);
  };

  const handleSliderChange = (val: number) => {
    setDailyMinutes(val);
    AudioService.playPop();
    if (val >= 45) {
      AchievementService.unlock("annual_visionary");
    }
  };

  return (
    <section className="w-full max-w-5xl mx-auto px-4 my-10">
      <div className="bg-background text-secondary rounded-2xl border-4 border-primary p-6 sm:p-8 shadow-xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b-2 border-primary/20 mb-6 gap-3">
          <div className="flex items-center gap-3">
            <FaChartLine className="text-primary text-3xl" />
            <div>
              <h2 className="font-primary text-3xl sm:text-4xl text-primary font-bold">
                {translate("annualProjectionsTitle")} 📈
              </h2>
              <p className="font-secondary text-sm sm:text-base text-secondary-light">
                {translate("annualProjectionsSubtitle")}
              </p>
            </div>
          </div>
          <span className="font-typewriter text-xs text-primary-dark bg-background-dark py-1 px-3 rounded-full border border-primary/20 self-start sm:self-auto font-bold">
            Throne ROI Report
          </span>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Daily Minutes Slider */}
          <div className="bg-white p-4 rounded-xl border-2 border-primary/20 flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <label className="font-secondary text-primary-dark font-bold text-base">
                {translate("dailyThroneTime")}
              </label>
              <span className="font-typewriter text-xl font-bold text-primary">
                {dailyMinutes} min/dia
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="90"
              step="5"
              value={dailyMinutes}
              onChange={(e) => handleSliderChange(parseInt(e.target.value, 10))}
              className="w-full accent-primary h-2 bg-background-dark rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-secondary text-secondary-light mt-1">
              <span>5 min (rápido)</span>
              <span>45 min (meditativo)</span>
              <span>90 min (fuga)</span>
            </div>
          </div>

          {/* Days Per Week */}
          <div className="bg-white p-4 rounded-xl border-2 border-primary/20 flex flex-col justify-between shadow-sm">
            <label className="font-secondary text-primary-dark font-bold text-base mb-2">
              {translate("daysWorkedPerWeek")}
            </label>
            <div className="flex rounded-lg overflow-hidden border border-primary/30">
              {[3, 4, 5, 6].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => {
                    setDaysPerWeek(days);
                    AudioService.playPop();
                  }}
                  className={`flex-1 py-2 text-sm font-secondary font-bold transition-colors ${
                    daysPerWeek === days
                      ? "bg-primary text-background"
                      : "bg-white text-secondary hover:bg-amber-50"
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
            <span className="text-[11px] font-secondary text-secondary-light mt-2">
              {totalAnnualDays} dias de trabalho/ano
            </span>
          </div>

          {/* Monthly Salary Input */}
          <div className="bg-white p-4 rounded-xl border-2 border-primary/20 flex flex-col justify-between shadow-sm">
            <label className="font-secondary text-primary-dark font-bold text-base mb-2">
              {translate("approxSalaryMonth")}
            </label>
            <div className="flex rounded-lg border border-primary/30 overflow-hidden">
              <select
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  AudioService.playPop();
                }}
                className="bg-background-dark font-secondary font-bold text-primary-dark px-2 text-sm border-r border-primary/30 focus:outline-none"
              >
                <option value="BRL">R$</option>
                <option value="USD">$</option>
                <option value="EUR">€</option>
              </select>
              <input
                type="number"
                min="500"
                step="500"
                value={monthlySalary}
                onChange={(e) => setMonthlySalary(Math.max(1, parseInt(e.target.value, 10) || 0))}
                className="w-full py-1.5 px-3 text-base font-typewriter text-secondary focus:outline-none"
              />
            </div>
            <span className="text-[11px] font-secondary text-secondary-light mt-2">
              Base de cálculo 160h/mês
            </span>
          </div>
        </div>

        {/* 3 Major Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          {/* Card 1: Annual Cash */}
          <div className="bg-background-dark/90 rounded-xl p-5 border-2 border-primary/30 shadow-inner flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl mb-2">
              <FaCoins />
            </div>
            <span className="font-secondary text-primary-dark font-semibold text-base sm:text-lg">
              {translate("annualTotalCash")}
            </span>
            <div className="font-primary text-3xl sm:text-4xl text-primary font-bold my-1">
              {formatCurrency(annualEarnings)}
            </div>
            <span className="text-xs font-secondary text-secondary-light">
              Faturamento anual 100% patrocinado pelo empregador
            </span>
          </div>

          {/* Card 2: Annual Hours */}
          <div className="bg-background-dark/90 rounded-xl p-5 border-2 border-primary/30 shadow-inner flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl mb-2">
              <FaHourglassHalf />
            </div>
            <span className="font-secondary text-primary-dark font-semibold text-base sm:text-lg">
              {translate("annualTotalHours")}
            </span>
            <div className="font-primary text-3xl sm:text-4xl text-primary font-bold my-1">
              {Math.round(totalAnnualHours)} horas
            </div>
            <span className="text-xs font-secondary text-secondary-light">
              Tempo total investido em reflexão no trono
            </span>
          </div>

          {/* Card 3: Free Vacation Days Equivalent */}
          <div className="bg-background-dark/90 rounded-xl p-5 border-2 border-primary/30 shadow-inner flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl mb-2">
              <FaUmbrellaBeach />
            </div>
            <span className="font-secondary text-primary-dark font-semibold text-base sm:text-lg">
              {translate("annualVacationEquiv")}
            </span>
            <div className="font-primary text-3xl sm:text-4xl text-primary font-bold my-1">
              {equivalentWorkDays} {translate("days")}
            </div>
            <span className="text-xs font-secondary text-secondary-light">
              Equivale a dias úteis inteiros de "férias remuneradas"
            </span>
          </div>
        </div>

        {/* Fun Insight Callout */}
        <div className="mt-6 p-4 rounded-xl bg-amber-50 border-2 border-primary/20 flex items-start gap-3 text-secondary">
          <FaInfoCircle className="text-primary text-xl shrink-0 mt-0.5" />
          <div className="text-sm font-secondary">
            <strong className="text-primary-dark font-bold text-base block mb-0.5">
              {translate("didYouKnowTitle")}
            </strong>
            <span>
              {translate("didYouKnowText")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
