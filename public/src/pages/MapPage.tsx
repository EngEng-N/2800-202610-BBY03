import { useState, useRef, useEffect } from "react";
import { Search, User, MapPin } from "lucide-react";
import { Joyride } from "react-joyride";
import type { Step } from "react-joyride";

{
  /*
Check wireflow for reference: https://www.figma.com/design/fu3jVRM7yiI5Mw7bEADW5L/2800-BBY-03?node-id=0-1&t=5cqgCQAvjjqLinWP-0
M1 - No UI, waiting for location to be Selected
M2 - Change location or verify usage of this area
M3 - Main UI
*/
}

type AppStep = "M1" | "M2" | "M3" | "M4";

export default function MapPage() {
  const [step, setStep] = useState<AppStep>("M1");
  const [radius, setRadius] = useState(250);
  const [location, setLocation] = useState<string>(
    "Tap the map to select a location",
  );
  const [runTour, setRunTour] = useState(false);

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

  // Listen for location selected event from the map iframe
  useEffect(() => {
    const handleMessage = async (e: MessageEvent) => {
      if (e.data?.type === "LOCATION_SELECTED") {
        const { lat, lng } = e.data;
        setCoords({ lat, lng });

        // Reverse geocode coordinates to a readable address
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          );
          const data = await res.json();
          const label =
            data.display_name?.split(",").slice(0, 2).join(",") ??
            `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          setLocation(label);
        } catch {
          setLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }

        setStep("M2");
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

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

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  return (
    <div className="relative h-screen w-full flex flex-col bg-[#1a1a2e] overflow-hidden">
      {/* Search bar - Non functional atm */}
      <div className="relative z-10 flex items-center gap-3 px-4 pt-10 pb-4">
        <div className="flex-1 flex items-center gap-2 bg-[#2a2a3e] rounded-2xl px-4 py-3">
          <Search size={18} className="text-white/50" />
          <input
            type="text"
            placeholder="Search Location"
            className="bg-transparent text-white placeholder-white/40 outline-none w-full text-sm"
          />
        </div>
        <div className="bg-[#2a2a3e] p-3 rounded-2xl">
          <User size={18} className="text-white" />
        </div>
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
          {/* Drag handle */}
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

          {/* Selected location */}
          <div className="flex items-center gap-2 text-white text-sm mb-4">
            <MapPin size={14} className="text-blue-400" />
            <span>{location}</span>
          </div>

          {/* Radius slider - sends value to the map iframe */}
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

          {/* Radius preset buttons (250m, 500m, 1000m, 5000m) */}
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

          {/* Stats - area scales with radius, vendors are placeholders until backend is connected */}
          <div className="flex gap-4 mb-6 stats-section">
            <div className="flex-1 bg-[#2a2a3e] rounded-2xl p-4">
              <p className="text-white text-lg font-bold">
                {((Math.PI * Math.pow(radius, 2)) / 1_000_000).toFixed(2)}
              </p>
              <p className="text-white/40 text-xs">Area km²</p>
            </div>
            <div className="flex-1 bg-[#2a2a3e] rounded-2xl p-4">
              <p className="text-white text-lg font-bold">4</p>
              <p className="text-white/40 text-xs">Outdoor vendors</p>
            </div>
            <div className="flex-1 bg-[#2a2a3e] rounded-2xl p-4">
              <p className="text-white text-lg font-bold">6</p>
              <p className="text-white/40 text-xs">Indoor vendors</p>
            </div>
          </div>

          {/* Generate report button */}
          <button
            onClick={async () => {
              if (!coords) return;
              setStep("M4");
              const res = await fetch(
                `/api/report-data?lat=${coords.lat}&lng=${coords.lng}`,
              );
              const data = await res.json();
              console.log(data); // we'll replace this with navigation to report page next
              setStep("M3"); // temporary — will navigate to report page instead
            }}
            className="w-full bg-blue-500 hover:bg-blue-600 active:scale-95 transition-all text-white font-semibold py-4 rounded-full text-base generate-button"
          >
            Generate report ↗
          </button>
        </div>
      )}

      {/* M4 - Loading Overlay for generating report */}
      {step === "M4" && (
        <div className="absolute inset-0 bg-black/70 z-20 flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-4 border-white/20 border-t-blue-400 rounded-full animate-spin" />
          <p className="text-white font-semibold text-lg">
            Generating Report...
          </p>
          <p className="text-white/50 text-sm">
            Analyzing food access vulnerability
          </p>
        </div>
      )}

      <Joyride steps={tourSteps} run={runTour} continuous />
    </div>
  );
}
