import { useEffect, useState } from "react";
import { Location } from "../../entities/Location";
import Odometer from "react-odometerjs";
import "odometer/themes/odometer-theme-car.css";

type CocometerProps = {
  locations: Location[];
  title: string;
};

export function Cocometer(props: CocometerProps) {
  const [totalEarningsByCurrency, setTotalEarningsByCurrency] = useState<{
    BRL: number;
    USD: number;
    EUR: number;
  }>({
    BRL: 0,
    USD: 0,
    EUR: 0,
  });

  useEffect(() => {
    updateTotalEarningsByCurrency();
  }, [props.locations]);

  const updateTotalEarningsByCurrency = () => {
    const earnings = props.locations.reduce(
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

  return (
    <>
      <h1 className="font-primary text-4xl justify-center text-center  my-4">
        {props.title}
      </h1>
      <div className="flex flex-col lg:flex-row items-center justify-center gap-2 lg:gap-6">
        {parseFloat(totalEarningsByCurrency.BRL.toFixed(2)) > 0 && (
          <h1 className="font-primary text-3xl lg:text-4xl justify-center text-center my-4 flex gap-2 items-center">
            <span>R$</span>
            <Odometer
              value={parseFloat(totalEarningsByCurrency.BRL.toFixed(2))}
              format="(.ddd),dd"
            />
          </h1>
        )}
        {/* {parseFloat(totalEarningsByCurrency.USD.toFixed(2)) > 0 && (
          <span className=" text-3xl lg:text-4xl">💩</span>
        )} */}
        {parseFloat(totalEarningsByCurrency.USD.toFixed(2)) > 0 && (
          <>
            <h1 className="font-primary text-3xl lg:text-4xl justify-center text-center my-4 flex gap-2 items-center">
              <span>$</span>
              <Odometer
                value={parseFloat(totalEarningsByCurrency.USD.toFixed(2))}
                format="(.ddd),dd"
              />
            </h1>
          </>
        )}
        {/* {parseFloat(totalEarningsByCurrency.EUR.toFixed(2)) > 0 && (
          <span className="text-3xl lg:text-4xl">💩</span>
        )} */}
        {parseFloat(totalEarningsByCurrency.EUR.toFixed(2)) > 0 && (
          <h1 className="font-primary text-3xl lg:text-4xl justify-center text-center my-4 flex gap-2 items-center">
            <span>€</span>
            <Odometer
              value={parseFloat(totalEarningsByCurrency.EUR.toFixed(2))}
              format="(.ddd),dd"
            />
          </h1>
        )}
      </div>
    </>
  );
}
