import React, { useState, useEffect, useRef } from "react";
import {
  FaSearch,
  FaMapMarkerAlt,
  FaTimes,
  FaSpinner,
  FaGlobeAmericas,
} from "react-icons/fa";
import { searchPlaces, AutocompletePlace } from "../../services/geocoding";
import { AudioService } from "../../utils/audio";
import { translate } from "../../languages/translator";

interface PlaceAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onSelectPlace: (place: AutocompletePlace) => void;
  placeholder?: string;
  userLat?: number;
  userLng?: number;
  inputClassName?: string;
  containerClassName?: string;
  required?: boolean;
  autoFocus?: boolean;
  id?: string;
}

export function PlaceAutocomplete({
  value,
  onChange,
  onSelectPlace,
  placeholder,
  userLat,
  userLng,
  inputClassName,
  containerClassName = "",
  required = false,
  autoFocus = false,
  id = "place-autocomplete",
}: PlaceAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AutocompletePlace[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search on input change
  useEffect(() => {
    if (!value || value.trim().length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    // Cancel prior request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchPlaces(value, {
          lat: userLat,
          lng: userLng,
          limit: 5,
          signal: controller.signal,
        });
        setSuggestions(results);
        setIsOpen(true);
        setHighlightedIndex(-1);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, userLat, userLng]);

  const handleSelect = (place: AutocompletePlace) => {
    AudioService.playPop();
    onSelectPlace(place);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    AudioService.playPop();
    onChange("");
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative w-full ${containerClassName}`}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          required={required}
          autoFocus={autoFocus}
          autoComplete="off"
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0 && value.trim().length >= 2) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || translate("searchPlace")}
          className={
            inputClassName ||
            "w-full py-2.5 pl-9 pr-8 rounded-lg border-2 border-primary-dark font-secondary text-lg text-secondary bg-white focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-secondary-light/60"
          }
        />

        {/* Leading Search Icon */}
        <div className="absolute left-3 text-primary-dark/60 pointer-events-none flex items-center">
          {isLoading ? (
            <FaSpinner className="animate-spin text-primary text-sm" />
          ) : (
            <FaSearch className="text-sm" />
          )}
        </div>

        {/* Clear input button */}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 text-secondary-light hover:text-primary transition-colors p-1 rounded-md"
            title="Limpar busca"
            aria-label="Limpar busca"
          >
            <FaTimes size={13} />
          </button>
        )}
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-background border-2 border-primary rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-primary/20 animate-fade-in">
          {suggestions.length > 0 ? (
            <ul className="max-h-72 overflow-y-auto" role="listbox">
              {suggestions.map((item, idx) => (
                <li
                  key={item.id}
                  role="option"
                  aria-selected={highlightedIndex === idx}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`px-3.5 py-2.5 cursor-pointer flex items-start gap-3 transition-colors ${
                    highlightedIndex === idx
                      ? "bg-primary/20 text-primary-dark font-semibold"
                      : "hover:bg-amber-50 text-secondary"
                  }`}
                >
                  <div className="mt-0.5 text-primary shrink-0">
                    <FaMapMarkerAlt size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-secondary text-base text-primary-dark font-bold truncate">
                      {item.name}
                    </div>
                    <div className="font-secondary text-xs text-secondary-light truncate">
                      {item.fullAddress}
                    </div>
                  </div>
                  {item.city && (
                    <span className="text-[11px] font-secondary bg-background-dark/80 px-2 py-0.5 rounded text-primary-dark border border-primary/20 shrink-0 hidden sm:inline">
                      {item.city}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            !isLoading && (
              <div className="p-4 text-center font-secondary text-sm text-secondary-light">
                {translate("noLocationsFound") || "Nenhum local encontrado para esta busca."}
              </div>
            )
          )}

          {/* Footer badge with OpenStreetMap credit */}
          <div className="bg-background-dark/80 px-3 py-1.5 flex items-center justify-between text-[11px] font-secondary text-secondary-light border-t border-primary/10">
            <span className="flex items-center gap-1">
              <FaGlobeAmericas className="text-primary text-xs" />
              <span>{translate("freeAutocomplete") || "Busca gratuita via OpenStreetMap"}</span>
            </span>
            <span className="opacity-70">100% livre</span>
          </div>
        </div>
      )}
    </div>
  );
}
