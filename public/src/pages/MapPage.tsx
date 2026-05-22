import { useState, useRef, useEffect } from "react";
import { Search, User, MapPin, X } from "lucide-react";
import { Joyride } from "react-joyride";
import type { Step } from "react-joyride";
import { useNavigate } from "react-router-dom";

{
  /*
Check wireflow for reference: https://www.figma.com/design/fu3jVRM7yiI5Mw7bEADW5L/2800-BBY-03?node-id=0-1&t=5cqgCQAvjjqLinWP-0
M1 - No UI, waiting for location to be Selected
M2 - Change location or verify usage of this area
M3 - Main UI
*/
}

type AppStep = "M1" | "M2" | "M3" | "M4";

const OUTDOOR_SOURCES = ["community-gardens-and-food-trees", "food-vendors"];
const INDOOR_SOURCES = ["free-low-cost-food", "food-related-businesses", "restaurants"];

async function fetchVendorCount(
  sources: string[],
  lat: number,
  lng: number,
  radius: number,
): Promise<number> {
  const totals = await Promise.all(
    sources.map(async (path) => {
      try {
        const response = await fetch(
          `/api/datasets/${path}?lat=${lat}&lon=${lng}&radius=${radius}m`,
        );
        const data = await response.json();
        return Number(data.total_count ?? 0);
      } catch {
        return 0;
      }
    }),
  );
  return totals.reduce((sum, count) => sum + count, 0);
}

export default function MapPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<AppStep>("M1");
  const [radius, setRadius] = useState(250);
  const [location, setLocation] = useState<string>(
    "Tap the map to select a location",
  );
  const [runTour, setRunTour] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  //Geocoding
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])

  // Reference to the iframe so we can talk to the map inside it
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Updates MapPage slider + tells the map inside the iframe to update its circle
  const updateRadius = (r: number) => {
    setRadius(r);
    iframeRef.current?.contentWindow?.postMessage(
      { type: "SET_RADIUS", radius: r },
      "*",
    );
  };

  const searchLocation = async (q: string) => {
  setQuery(q)
  if (q.length < 3) { setSuggestions([]); return }
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=4`
    )
    const data = await res.json()
    setSuggestions(data)
  } catch {
    setSuggestions([])
  }
}

const selectSuggestion = (place: any) => {
  const lat = parseFloat(place.lat)
  const lng = parseFloat(place.lon)
  setLocation(place.display_name.split(',').slice(0, 2).join(','))
  setQuery('')
  setSuggestions([])
  iframeRef.current?.contentWindow?.postMessage({ type: 'PAN_TO', lat, lng }, '*')
  iframeRef.current?.contentWindow?.postMessage({ type: 'PLACE_CIRCLE', lat, lng }, '*')
  setCoords({ lat, lng })
  setStep('M2')
}

  // Listen for location selected event from the map iframe
  const [outdoor, setOutdoor] = useState(0);
  const [indoor, setIndoor] = useState(0);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  const radiusRef = useRef(radius);
  useEffect(() => {
    radiusRef.current = radius;
  }, [radius]);

  useEffect(() => {
    const handleMessage = async (e: MessageEvent) => {
      if (e.data?.type === "LOCATION_SELECTED") {
        const selectedLat = e.data.lat;
        const selectedLng = e.data.lng;
        setCoords({ lat: selectedLat, lng: selectedLng });
        setOutdoor(0);
        setIndoor(0);
        setReportError(null);

        fetchVendorCount(OUTDOOR_SOURCES, selectedLat, selectedLng, radiusRef.current).then(setOutdoor);
        fetchVendorCount(INDOOR_SOURCES, selectedLat, selectedLng, radiusRef.current).then(setIndoor);

        // Reverse geocode coordinates to a readable address
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${selectedLat}&lon=${selectedLng}&format=json`,
          );
          const data = await res.json();
          const label =
            data.display_name?.split(",").slice(0, 2).join(",") ??
            `${selectedLat.toFixed(4)}, ${selectedLng.toFixed(4)}`;
          setLocation(label);
        } catch {
          setLocation(`${selectedLat.toFixed(4)}, ${selectedLng.toFixed(4)}`);
        }

        setStep("M2");
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (!coords) return;

    setOutdoor(0);
    setIndoor(0);

    fetchVendorCount(OUTDOOR_SOURCES, coords.lat, coords.lng, radius).then(setOutdoor);
    fetchVendorCount(INDOOR_SOURCES, coords.lat, coords.lng, radius).then(setIndoor);
  }, [coords, radius]);

  const handleGenerateReport = async () => {
    if (!coords) return;
    setStep("M4");
    setReportError(null);
    try {
      const [outdoorCount, indoorCount] = await Promise.all([
        fetchVendorCount(OUTDOOR_SOURCES, coords.lat, coords.lng, radius),
        fetchVendorCount(INDOOR_SOURCES, coords.lat, coords.lng, radius),
      ]);

      const res = await fetch(
        `/api/report-data?lat=${coords.lat}&lng=${coords.lng}&radius=${radius}&outdoor=${outdoorCount}&indoor=${indoorCount}`,
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${res.status})`);
      }

      const data = await res.json();
      navigate("/results", {
        state: {
          report: data,
          outdoor: outdoorCount,
          indoor: indoorCount,
          lat: coords.lat,
          lng: coords.lng,
          radius,
        },
      });
    } catch (err) {
      setReportError(
        err instanceof Error ? err.message : "Failed to generate report. Try again.",
      );
      setStep("M3");
    }
  };

  // Tour steps
  const tourSteps: Step[] = [
    {
      target: ".map-iframe",
      content:
        "This is the interactive map. Clicking anywhere will select that location for analysis.",
      placement: "center",
    },
    {
      target: ".location-display",
      content:
        "Your selected location will appear here. You can verify or change it.",
      placement: "bottom",
    },
    {
      target: ".radius-slider",
      content: "Adjust the radius to define the area you want to analyze.",
      placement: "top",
    },
    {
      target: ".radius-buttons",
      content: "Or use these preset buttons for quick radius selection.",
      placement: "bottom",
    },
    {
      target: ".stats-section",
      content:
        "View the area coverage and number of vendors in your selected radius.",
      placement: "top",
    },
    {
      target: ".generate-button",
      content: "Click here to generate a detailed report for this area.",
      placement: "top",
    },
  ];

return (
  <div className="relative h-screen w-full flex flex-col bg-[#1a1a2e] overflow-hidden">

    {/* Search bar with geocoding */}
    <div className="relative z-10 flex items-center gap-3 px-4 pt-10 pb-4">
      <div className="flex-1 relative">
        <div className="flex items-center gap-2 bg-[#2a2a3e] rounded-2xl px-4 py-3">
          <Search size={18} className="text-white/50" />
          <input
            type="text"
            placeholder="Search Location"
            value={query}
            onChange={(e) => searchLocation(e.target.value)}
            className="bg-transparent text-white placeholder-white/40 outline-none w-full text-sm"
          />
          {query.length > 0 && (
            <X size={16} className="text-white/40 cursor-pointer" onClick={() => { setQuery(''); setSuggestions([]) }} />
          )}
        </div>
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#2a2a3e] rounded-2xl overflow-hidden z-30">
            {suggestions.map((place, i) => (
              <button
                key={i}
                onMouseDown={() => selectSuggestion(place)}
                className="w-full px-4 py-3 text-left text-white/70 text-sm hover:bg-[#3a3a4e] border-b border-white/5 last:border-0"
              >
                {place.display_name.split(',').slice(0, 3).join(',')}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={() => navigate("/account")}
        className="bg-[#2a2a3e] p-3 rounded-2xl active:scale-95 transition-transform"
        aria-label="Account"
      >
        <User size={18} className="text-white" />
      </button>
    </div>

    {/* Map iframe - loads the map.html Thor made */}
    <div
      className="mx-4 rounded-3xl overflow-hidden transition-all duration-300"
      style={{
        height: step === "M3" ? "35vh" : "100%",
        flex: step === "M3" ? "none" : "1",
      }}
    >
      <iframe
        ref={iframeRef}
        src="/html/map.html"
        style={{
          width: "100%",
          height: "100%",
          minHeight: "400px",
          border: "none",
        }}
        title="Map"
        className="map-iframe"
      />
    </div>

    {/* Location bar for M2 */}
    {step !== "M3" && (
      <div className="px-4 py-3">
        <div className="bg-[#2a2a3e] rounded-2xl px-4 py-3 flex items-center gap-2 location-display">
          <MapPin size={14} className="text-blue-400" />
          <span className="text-white/60 text-sm">{location}</span>
        </div>
      </div>
    )}

    {/* M2 - Analyze or change location popup */}
    {step === "M2" && (
      <div className="absolute inset-0 bg-black/50 z-20 flex items-end px-8 pb-24">
        <div className="bg-[#2a2a3e] rounded-3xl p-6 w-full">
          <p className="text-white text-center font-semibold text-base mb-6">
            Analyze this area?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setStep("M1")}
              className="flex-1 py-3 rounded-2xl bg-[#1a1a2e] text-white/60 text-sm font-medium"
            >
              Change location
            </button>
            <button
              onClick={() => {
                setStep("M3");
                setRunTour(true);
              }}
              className="flex-1 py-3 rounded-2xl bg-blue-500 text-white text-sm font-medium"
            >
              Use this area
            </button>
          </div>
        </div>
      </div>
    )}

    {/* M3 - Radius controls and stats */}
    {step === "M3" && (
      <div className="bg-[#1a1a2e] rounded-t-3xl px-6 pt-4 pb-8 overflow-y-auto max-h-[55vh]">
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
        <div className="flex items-center gap-2 text-white text-sm mb-4">
          <MapPin size={14} className="text-blue-400" />
          <span>{location}</span>
        </div>
        <div className="mb-3 radius-slider">
          <div className="flex justify-between text-xs text-white/50 mb-2">
            <span>Radius</span>
            <span className="text-green-400">{radius} m</span>
          </div>
          <input
            type="range"
            min={100}
            max={5000}
            value={radius}
            onChange={(e) => updateRadius(Number(e.target.value))}
            className="w-full accent-blue-400"
          />
        </div>
        <div className="flex gap-2 mb-6 radius-buttons">
          {[250, 500, 1000, 5000].map((r) => (
            <button
              key={r}
              onClick={() => updateRadius(r)}
              className={`flex-1 py-2 rounded-full text-xs font-medium border transition-all ${
                radius === r
                  ? "bg-white text-black border-white"
                  : "bg-transparent text-white border-white/20"
              }`}
            >
              {r >= 1000 ? `${r / 1000} km` : `${r} m`}
            </button>
          ))}
        </div>
        <div className="flex gap-4 mb-6 stats-section">
          <div className="flex-1 bg-[#2a2a3e] rounded-2xl p-4">
            <p className="text-white text-lg font-bold">
              {((Math.PI * Math.pow(radius, 2)) / 1_000_000).toFixed(2)}
            </p>
            <p className="text-white/40 text-xs">Area km²</p>
          </div>
          <div className="flex-1 bg-[#2a2a3e] rounded-2xl p-4">
            <p className="text-white text-lg font-bold">{outdoor}</p>
            <p className="text-white/40 text-xs">Outdoor vendors</p>
          </div>
          <div className="flex-1 bg-[#2a2a3e] rounded-2xl p-4">
            <p className="text-white text-lg font-bold">{indoor}</p>
            <p className="text-white/40 text-xs">Indoor vendors</p>
          </div>
        </div>
        {reportError && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center">
            <p className="text-red-300 text-sm">{reportError}</p>
          </div>
        )}
        <button
          onClick={handleGenerateReport}
          className="w-full bg-blue-500 hover:bg-blue-600 active:scale-95 transition-all text-white font-semibold py-4 rounded-full text-base generate-button"
        >
          Generate report ↗
        </button>
      </div>
    )}

    {/* M4 - Loading Overlay */}
    {step === "M4" && (
      <div className="absolute inset-0 bg-black/70 z-20 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-white/20 border-t-blue-400 rounded-full animate-spin" />
        <p className="text-white font-semibold text-lg">Generating Report...</p>
        <p className="text-white/50 text-sm">Analyzing food access vulnerability</p>
      </div>
    )}

    <Joyride steps={tourSteps} run={runTour} continuous />
  </div>
);
}
