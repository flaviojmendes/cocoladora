import { useEffect, useState } from "react";
import { Location } from "../../entities/Location";
import Odometer from "react-odometerjs";
import "odometer/themes/odometer-theme-car.css";
import { FaCoins, FaHistory } from "react-icons/fa";

type CocometerProps = {
  locations: Location[];
  title: string;
};

export function Cocometer({ locations, title }: CocometerProps) {
  const [totalEarnings, setTotalEarnings] = useState<{
    BRL: number;
    USD: number;
    EUR: number;
  }>({
    BRL: 0,
    USD: 0,
    EUR: 0,
  });

  useEffect(() => {
    const totals = locations.reduce(
      (acc, loc) => {
        if (typeof loc.totalearned === "string") {
          const valStr = loc.totalearned;
          const num = parseFloat(valStr.replace(/[^\d.-]/g, ""));
          if (!isNaN(num)) {
            if (valStr.includes("R$")) {
              acc.BRL += num;
            } else if (valStr.includes("$")) {
              acc.USD += num;
            } else if (valStr.includes("€")) {
              acc.EUR += num;
            } else {
              acc.BRL += num;
            }
          }
        } else if (typeof loc.totalearned === "number") {
          acc.BRL += loc.totalearned;
        }
        return acc;
      },
      { BRL: 0, USD: 0, EUR: 0 }
    );

    setTotalEarnings(totals);
  }, [locations]);

  return (
    <section className="w-full max-w-5xl mx-auto px-4 my-8">
      <div className="bg-background text-secondary rounded-2xl border-4 border-primary p-6 sm:p-8 shadow-xl">
        <div className="flex items-center justify-center gap-3 mb-2">
          <FaCoins className="text-primary text-3xl" />
          <h2 className="font-primary text-3xl sm:text-5xl text-primary font-bold text-center">
            {title}
          </h2>
        </div>
        <p className="font-secondary text-center text-lg sm:text-xl text-secondary mb-6">
          Total acumulado meditando no trono pela comunidade mundial
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          {/* BRL */}
          <div className="bg-background-dark/80 rounded-xl p-4 border-2 border-primary/20 flex flex-col items-center justify-center shadow-inner">
            <span className="font-secondary text-primary-dark font-semibold text-lg">
              Real Brasileiro (BRL)
            </span>
            <div className="font-primary text-3xl sm:text-4xl text-primary font-bold mt-1 flex items-center justify-center gap-1">
              <span>R$</span>
              <Odometer
                value={Number(totalEarnings.BRL.toFixed(2))}
                format="(.ddd),dd"
              />
            </div>
          </div>

          {/* USD */}
          <div className="bg-background-dark/80 rounded-xl p-4 border-2 border-primary/20 flex flex-col items-center justify-center shadow-inner">
            <span className="font-secondary text-primary-dark font-semibold text-lg">
              US Dollar (USD)
            </span>
            <div className="font-primary text-3xl sm:text-4xl text-primary font-bold mt-1 flex items-center justify-center gap-1">
              <span>$</span>
              <Odometer
                value={Number(totalEarnings.USD.toFixed(2))}
                format="(.ddd),dd"
              />
            </div>
          </div>

          {/* EUR */}
          <div className="bg-background-dark/80 rounded-xl p-4 border-2 border-primary/20 flex flex-col items-center justify-center shadow-inner">
            <span className="font-secondary text-primary-dark font-semibold text-lg">
              Euro (EUR)
            </span>
            <div className="font-primary text-3xl sm:text-4xl text-primary font-bold mt-1 flex items-center justify-center gap-1">
              <span>€</span>
              <Odometer
                value={Number(totalEarnings.EUR.toFixed(2))}
                format="(.ddd),dd"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-primary/20 flex items-center justify-center gap-2 text-secondary font-secondary text-base">
          <FaHistory className="text-primary" />
          <span>
            {locations.length} pausas remuneradas contabilizadas globalmente
          </span>
        </div>
      </div>
    </section>
  );
}
