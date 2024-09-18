import React, { useEffect, useRef, useState } from "react";
import { FaPoop, FaWindowClose } from "react-icons/fa";
import { Place } from "../../entities/Place";
import ReactGA from "react-ga4";

function loadScript(src: string, position: HTMLElement | null, id: string) {
  if (!position) return;

  const script = document.createElement("script");
  script.setAttribute("async", "");
  script.setAttribute("defer", "");
  script.setAttribute("id", id);
  script.src = src;
  position.appendChild(script);
}

export function RatePlace() {
  const mapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayRatePlace, setDisplayRatePlace] = useState(false);
  const [newPlace, setNewPlace] = useState<Place>();
  const [cleanRating, setCleanRating] = useState<number>(0);
  const [hoverCleanRating, setHoverCleanRating] = useState<number>(0);
  const [facilitiesRating, setFacilitiesRating] = useState<number>(0);
  const [hoverFacilitiesRating, setHoverFacilitiesRating] = useState<number>(0);
  const [privacyRating, setPrivacyRating] = useState<number>(0);
  const [hoverPrivacyRating, setHoverPrivacyRating] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [notes, setNotes] = useState<string>("");
  const [isRating, setIsRating] = useState(false);

  useEffect(() => {
    const scriptId = "google-maps-script";
    const googleMapsScript = document.getElementById(scriptId);

    if (!googleMapsScript) {
      loadScript(
        `https://maps.googleapis.com/maps/api/js?key=${
          import.meta.env.VITE_GOOGLE_MAPS_API_KEY
        }&libraries=places`,
        document.head,
        scriptId
      );
    }

    const handleScriptLoad = () => {
      if (!mapRef.current || !inputRef.current) return;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          const mapStyles = [
            {
              elementType: "geometry",
              stylers: [{ color: "#fcf9ea" }],
            },
            {
              elementType: "labels.text.stroke",
              stylers: [{ color: "#fcf9ea" }],
            },
            {
              elementType: "labels.text.fill",
              stylers: [{ color: "#292420" }],
            },
            {
              featureType: "administrative.locality",
              elementType: "labels.text.fill",
              stylers: [{ color: "#815028" }],
            },
            {
              featureType: "poi",
              elementType: "labels.text.fill",
              stylers: [{ color: "#815028" }],
            },
            {
              featureType: "poi.park",
              elementType: "geometry",
              stylers: [{ color: "#a95d2f" }],
            },
            {
              featureType: "poi.park",
              elementType: "labels.text.fill",
              stylers: [{ color: "#815028" }],
            },
            {
              featureType: "road",
              elementType: "geometry",
              stylers: [{ color: "#a95d2f" }],
            },
            {
              featureType: "road",
              elementType: "geometry.stroke",
              stylers: [{ color: "#815028" }],
            },
            {
              featureType: "road",
              elementType: "labels.text.fill",
              stylers: [{ color: "#815028" }],
            },
            {
              featureType: "water",
              elementType: "geometry",
              stylers: [{ color: "#292420" }],
            },
            {
              featureType: "water",
              elementType: "labels.text.fill",
              stylers: [{ color: "#815028" }],
            },
          ];

          const map = new google.maps.Map(mapRef.current!, {
            center: { lat: latitude, lng: longitude },
            zoom: 8,
            styles: mapStyles,
            disableDefaultUI: true, // Disable all controls
            draggable: false, // Disable map dragging
            scrollwheel: false, // Disable zooming with scroll wheel
          });

          const autocomplete = new google.maps.places.Autocomplete(
            inputRef.current!
          );
          autocomplete.bindTo("bounds", map);

          const marker = new google.maps.Marker({
            map,
            anchorPoint: new google.maps.Point(0, -29),
          });

          autocomplete.addListener("place_changed", () => {
            marker.setVisible(false);
            const place = autocomplete.getPlace();
            if (!place.geometry || !place.geometry.location) {
              
              return;
            }

            const location = place.geometry.location;
            setNewPlace({
              latitude: location.lat(),
              longitude: location.lng(),
              name: place.name,
              cleanRating: cleanRating,
              facilitiesRating: facilitiesRating,
              privacyRating: privacyRating,
              notes: notes,
            });

            if (place.geometry.viewport) {
              map.fitBounds(place.geometry.viewport);
            } else {
              map.setCenter(location);
              map.setZoom(17);
            }

            marker.setPosition(location);
            marker.setVisible(true);
          });
        },
        () => {
          
        }
      );
    };

    if (googleMapsScript) {
      googleMapsScript.addEventListener("load", handleScriptLoad);
    } else {
      window.addEventListener("load", handleScriptLoad);
    }

    return () => {
      if (googleMapsScript) {
        googleMapsScript.removeEventListener("load", handleScriptLoad);
      } else {
        window.removeEventListener("load", handleScriptLoad);
      }
    };
  }, []);

  const handleCleanRating = (rate: number) => {
    setCleanRating(rate);
    if (newPlace) {
      setNewPlace({ ...newPlace, cleanRating: rate });
    }
  };

  const handleFacilitiesRating = (rate: number) => {
    setFacilitiesRating(rate);
    if (newPlace) {
      setNewPlace({ ...newPlace, facilitiesRating: rate });
    }
  };

  const handlePrivacyRating = (rate: number) => {
    setPrivacyRating(rate);
    if (newPlace) {
      setNewPlace({ ...newPlace, privacyRating: rate });
    }
  };

  const handleRate = async () => {
    setIsRating(true);

    try {
      const response = await fetch(
        "https://saveplace-pzeq65kcvq-uc.a.run.app",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newPlace),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          setErrorMessage("Calma aí! Você está avaliando rápido demais.");
        }
        if (response.status === 400) {
          setErrorMessage("Por favor, preencha todos os campos.");
        }
        throw new Error("Network response was not ok");
      }

      setErrorMessage("");

      const data = await response.json();
      // reset form
      setCleanRating(0);
      setFacilitiesRating(0);
      setPrivacyRating(0);
      setNotes("");
      setNewPlace(undefined);
      inputRef.current!.value = "";
      setHoverCleanRating(0);
      setHoverFacilitiesRating(0);
      setHoverPrivacyRating(0);

      ReactGA.event({
        category: "Rate",
        action: "Rate Place",
        label: window.location.pathname + window.location.search,
      });
      setDisplayRatePlace(false);
    } catch (error) {
      
    } finally {
      setIsRating(false);
      
    }
  };

  const handleNotes = (value: string) => {
    setNotes(value);
    if (newPlace) {
      setNewPlace({ ...newPlace, notes: value });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className={`w-full mt-10 justify-center lg:justify-start`}>
        <button
          className={`flex bg-primary p-4 mx-auto lg:mx-0 gap-2 w-fit font-secondary text-2xl cursor-pointer items-center text-background border-4 border-primary rounded-lg h-fit`}
          onClick={() => {
            setDisplayRatePlace(true);
            ReactGA.event({
              category: "Rate",
              action: "Open Rating",
              label: window.location.pathname + window.location.search,
            });
          }}
        >
          Avaliar um <img src="/sam.png" className="w-16"></img>
        </button>
      </div>
      <div
        className={`${
          displayRatePlace ? "flex" : "hidden"
        } flex-col items-center mx-auto w-11/12 lg:w-11/12 relative h-fit gap-4 bg-background py-5 px-2 lg:px-14 rounded-2xl border-4 border-primary shadow-md shadow-secondary`}
      >
        <span className="absolute top-2 right-2 cursor-pointer text-primary text-2xl">
          <FaWindowClose onClick={() => setDisplayRatePlace(false)} />
        </span>
        <input
          ref={inputRef}
          type="text"
          placeholder="Procure um lugar.."
          className="w-full mt-6 px-6 py-3 text-lg font-secondary text-center text-primary-dark font-semibold bg-white border-4 border-primary-dark rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:ring-primary placeholder-primary placeholder-opacity-80"
        />
        <div ref={mapRef} style={{ height: "400px", width: "100%" }}></div>
        <div className="flex items-center gap-2 w-full text-xl font-secondary text-primary-dark">
          <span>Avalie a Limpeza:</span>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((rate) => (
              <FaPoop
                key={rate}
                className={`cursor-pointer ${
                  hoverCleanRating >= rate || cleanRating >= rate
                    ? "text-yellow-500"
                    : "text-gray-400"
                }`}
                onClick={() => handleCleanRating(rate)}
                onMouseEnter={() => setHoverCleanRating(rate)}
                onMouseLeave={() => setHoverCleanRating(0)}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 w-full text-xl font-secondary text-primary-dark">
          <span>Avalie as Facilidades:</span>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((rate) => (
              <FaPoop
                key={rate}
                className={`cursor-pointer ${
                  hoverFacilitiesRating >= rate || facilitiesRating >= rate
                    ? "text-yellow-500"
                    : "text-gray-400"
                }`}
                onClick={() => handleFacilitiesRating(rate)}
                onMouseEnter={() => setHoverFacilitiesRating(rate)}
                onMouseLeave={() => setHoverFacilitiesRating(0)}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 w-full text-xl font-secondary text-primary-dark">
          <span>Avalie a Privacidade:</span>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((rate) => (
              <FaPoop
                key={rate}
                className={`cursor-pointer ${
                  hoverPrivacyRating >= rate || privacyRating >= rate
                    ? "text-yellow-500"
                    : "text-gray-400"
                }`}
                onClick={() => handlePrivacyRating(rate)}
                onMouseEnter={() => setHoverPrivacyRating(rate)}
                onMouseLeave={() => setHoverPrivacyRating(0)}
              />
            ))}
          </div>
        </div>
        <textarea
          placeholder="Comentários..."
          rows={2}
          maxLength={200}
          value={notes}
          onChange={(e) => handleNotes(e.target.value)}
          className="w-full px-6 py-3 font-secondary text-lg text-primary-dark font-semibold bg-white border-4 border-primary-dark rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:ring-primary placeholder-primary placeholder-opacity-80"
        />
        {/* Rate Button */}
        <button
          onClick={handleRate}
          disabled={isRating}
          className={`mt-4 px-4 py-2 text-2xl bg-primary font-secondary text-background rounded-lg shadow-lg hover:bg-primary-dark focus:outline-none ${
            isRating ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isRating ? "Avaliando..." : "Avaliar"}
        </button>
        {errorMessage && (
          <span className="text-red-500 text-lg font-secondary">{errorMessage}</span>
        )}
      </div>
    </div>
  );
}
