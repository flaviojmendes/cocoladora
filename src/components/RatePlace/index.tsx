import React, { useState } from "react";
import { FaMapMarkerAlt, FaPoop, FaTimes, FaToiletPaper, FaCheckCircle } from "react-icons/fa";
import { Place } from "../../entities/Place";
import { ComponentType } from "../../entities/ComponentType";
import { translate } from "../../languages/translator";
import { StorageService } from "../../services/storage";

type RatePlaceProps = {
  selectedComponent: ComponentType | null;
  setSelectedComponent: (component: ComponentType | null) => void;
  onPlaceAdded?: (places: { [key: string]: Place }) => void;
};

export function RatePlace({
  selectedComponent,
  setSelectedComponent,
  onPlaceAdded,
}: RatePlaceProps) {
  const [placeName, setPlaceName] = useState("");
  const [placeCity, setPlaceCity] = useState("");
  const [cleanRating, setCleanRating] = useState<number>(4);
  const [hoverCleanRating, setHoverCleanRating] = useState<number>(0);
  const [facilitiesRating, setFacilitiesRating] = useState<number>(4);
  const [hoverFacilitiesRating, setHoverFacilitiesRating] = useState<number>(0);
  const [privacyRating, setPrivacyRating] = useState<number>(4);
  const [hoverPrivacyRating, setHoverPrivacyRating] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [latitude, setLatitude] = useState<number>(-23.5505);
  const [longitude, setLongitude] = useState<number>(-46.6333);
  const [isLocating, setIsLocating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (selectedComponent !== ComponentType.RatePlace) {
    return null;
  }

  const getRatingLabel = (score: number) => {
    switch (score) {
      case 1:
        return translate("ratingPoor");
      case 2:
        return translate("ratingFair");
      case 3:
        return translate("ratingGood");
      case 4:
        return translate("ratingGreat");
      case 5:
        return translate("ratingExcellent");
      default:
        return "";
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage("Geolocalização não suportada no seu navegador.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        if (!placeCity) {
          setPlaceCity("Local Atual");
        }
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        setErrorMessage("Não foi possível obter sua localização atual.");
      }
    );
  };

  const handlePresetSelect = (preset: string) => {
    setPlaceName(preset);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeName.trim()) {
      setErrorMessage("Por favor, preencha o nome do local.");
      return;
    }

    const newPlace: Place = {
      id: `place-${Date.now()}`,
      name: placeName.trim(),
      latitude,
      longitude,
      cleanRating,
      facilitiesRating,
      privacyRating,
      notes: notes.trim() ? [notes.trim()] : ["Banheiro avaliado pela comunidade."],
    };

    const updatedPlaces = await StorageService.addPlace(newPlace);
    onPlaceAdded?.(updatedPlaces);

    setIsSuccess(true);
    setErrorMessage("");

    setTimeout(() => {
      // reset form
      setPlaceName("");
      setPlaceCity("");
      setNotes("");
      setCleanRating(4);
      setFacilitiesRating(4);
      setPrivacyRating(4);
      setIsSuccess(false);
      setSelectedComponent(null);
    }, 1500);
  };

  const renderRatingGroup = (
    label: string,
    current: number,
    hover: number,
    setScore: (n: number) => void,
    setHover: (n: number) => void
  ) => {
    const activeScore = hover || current;
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-xl border-2 border-primary/20">
        <div>
          <span className="font-secondary text-primary-dark font-bold text-lg">
            {label}
          </span>
          <span className="block text-xs font-secondary text-secondary-light">
            {getRatingLabel(activeScore)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              type="button"
              key={star}
              aria-label={`${label} ${star} de 5`}
              onClick={() => setScore(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="p-1 focus:outline-none transition-transform hover:scale-110"
            >
              <FaToiletPaper
                size={24}
                className={
                  activeScore >= star
                    ? "text-amber-500 drop-shadow-sm"
                    : "text-gray-300"
                }
              />
            </button>
          ))}
          <span className="font-primary text-xl text-primary font-bold ml-2 min-w-[20px] text-right">
            {activeScore}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 mt-6">
      <div className="relative bg-background text-secondary rounded-2xl border-4 border-primary p-6 sm:p-8 shadow-xl">
        {/* Close Button */}
        <button
          onClick={() => setSelectedComponent(null)}
          aria-label={translate("close")}
          className="absolute top-4 right-4 text-primary hover:text-primary-dark transition-colors p-2 rounded-lg hover:bg-background-dark focus:outline-none"
        >
          <FaTimes size={24} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b-2 border-primary/20 mb-6">
          <span className="text-3xl">🧻</span>
          <div>
            <h2 className="font-primary text-3xl sm:text-4xl text-primary font-bold">
              {translate("ratePoop")}
            </h2>
            <p className="font-secondary text-base sm:text-lg text-secondary-light">
              Ajude a comunidade a catalogar os melhores e piores tronos do mundo
            </p>
          </div>
        </div>

        {isSuccess ? (
          <div className="py-12 flex flex-col items-center justify-center text-center animate-fade-in">
            <FaCheckCircle className="text-green-600 text-6xl mb-3" />
            <h3 className="font-primary text-3xl text-primary font-bold mb-2">
              {translate("ratingSuccess")}
            </h3>
            <p className="font-secondary text-xl text-secondary">
              Seu banheiro foi gravado e já está visível no mapa de exploração!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Quick Suggestions */}
            <div>
              <span className="block font-secondary text-sm text-secondary-light mb-1">
                Sugestões rápidas de local:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  "Shopping",
                  "Aeroporto",
                  "Café / Coworking",
                  "Restaurante",
                  "Posto de Estrada",
                  "Metrô / Trem",
                ].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handlePresetSelect(item)}
                    className="text-xs sm:text-sm font-secondary bg-background-dark hover:bg-primary hover:text-background border border-primary/30 px-3 py-1 rounded-full transition-colors"
                  >
                    + {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Place Name and City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-secondary text-primary-dark font-semibold text-lg mb-1">
                  Nome do Local *
                </label>
                <input
                  type="text"
                  required
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  placeholder={translate("placeNamePlaceholder")}
                  className="w-full py-2.5 px-3 rounded-lg border-2 border-primary-dark font-secondary text-lg text-secondary bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-secondary text-primary-dark font-semibold text-lg mb-1">
                  Cidade ou Bairro
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={placeCity}
                    onChange={(e) => setPlaceCity(e.target.value)}
                    placeholder={translate("cityPlaceholder")}
                    className="w-full py-2.5 px-3 rounded-lg border-2 border-primary-dark font-secondary text-lg text-secondary bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    title="Usar minha localização atual"
                    className="py-2.5 px-3 rounded-lg bg-background-dark hover:bg-primary hover:text-background border-2 border-primary/40 font-secondary text-primary-dark transition-colors flex items-center justify-center shrink-0"
                  >
                    <FaMapMarkerAlt />
                  </button>
                </div>
              </div>
            </div>

            {/* Ratings 1-5 */}
            <div className="flex flex-col gap-3">
              {renderRatingGroup(
                translate("cleaness"),
                cleanRating,
                hoverCleanRating,
                setCleanRating,
                setHoverCleanRating
              )}
              {renderRatingGroup(
                translate("facilities"),
                facilitiesRating,
                hoverFacilitiesRating,
                setFacilitiesRating,
                setHoverFacilitiesRating
              )}
              {renderRatingGroup(
                translate("privacy"),
                privacyRating,
                hoverPrivacyRating,
                setPrivacyRating,
                setHoverPrivacyRating
              )}
            </div>

            {/* Comments */}
            <div>
              <label className="block font-secondary text-primary-dark font-semibold text-lg mb-1">
                {translate("commentsLabel")}
              </label>
              <textarea
                rows={3}
                maxLength={300}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={translate("comments")}
                className="w-full p-3 rounded-lg border-2 border-primary-dark font-secondary text-base text-secondary bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {errorMessage && (
              <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-200 font-secondary text-base">
                {errorMessage}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-xl font-secondary text-2xl font-bold bg-primary hover:bg-primary-dark text-background shadow-lg transition-transform active:translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-primary/40 flex items-center justify-center gap-2"
            >
              <span>{translate("rate")}</span>
              <FaPoop />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
