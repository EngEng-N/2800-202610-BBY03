import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "../../css/ResultPanel.css";

interface ReportData {
  neighbourhood: string | null;
  coords: { lat: number; lng: number };
  radiusM: number;
  areaKm2: number;
  population: {
    neighbourhood: string;
    seniorsPercent: number;
    lowIncomePercent: number;
    renterPercent: number;
    seniorsScore: number;
    lowIncomeScore: number;
    renterScore: number;
    populationVulnerabilityScore: number;
  } | null;
  vendors: {
    outdoor: number;
    indoor: number;
    ratio: number | null;
  };
  scores: {
    heatExposureScore: number;
    floodExposureScore: number;
    climateDisruptionScore: number;
    heat: number;
    flood: number;
    population: number;
    diversity: number;
    overall: number;
  };
  stars: {
    heat: number;
    flood: number;
    population: number;
    diversity: number;
    overall: number;
  };
  inFloodZone: boolean;
  floodZoneName: string | null;
}

interface SavedLocation {
  _id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number | null;
  createdAt: string;
  outdoor?: number;
  indoor?: number;
  summary?: string | null;
  report: ReportData | null;
}

function renderStars(count: number): string {
  const clamped = Math.max(0, Math.min(5, count));
  return "★".repeat(clamped) + "☆".repeat(5 - clamped);
}

function fmtPct(n: number | null | undefined): string {
  return typeof n === "number" && Number.isFinite(n) ? `${n.toFixed(1)}%` : "—";
}

function fmtScore(n: number | null | undefined): string {
  return typeof n === "number" && Number.isFinite(n)
    ? `${Math.round(n)} / 100`
    : "—";
}

export default function SavedLocationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<SavedLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/saved-locations");
        if (!res.ok) {
          setError("Could not load saved location.");
          return;
        }
        const list: SavedLocation[] = await res.json();
        const found = list.find((l) => l._id === id) ?? null;
        if (!cancelled) {
          if (!found) setError("Saved location not found.");
          setItem(found);
          if (found?.summary) setSummary(found.summary);
        }
      } catch {
        if (!cancelled) setError("Network error.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!item?.report || summary || summaryLoading) return;
    let cancelled = false;
    setSummaryLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/summary", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            report: {
              ...item.report,
              outdoor: item.outdoor ?? 0,
              indoor: item.indoor ?? 0,
              lat: item.lat,
              lng: item.lng,
              radius: item.radius,
            },
          }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setSummary(data.summary ?? null);
      } catch {
        // silent — summary is optional
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [item, summary, summaryLoading]);

  const buildDownloadReport = (report: ReportData) => ({
    area: {
      neighbourhood: report.neighbourhood,
      coordinates: report.coords,
      radiusMeters: report.radiusM,
      areaKm2: report.areaKm2,
    },
    climate: {
      heatExposureScore: report.scores.heatExposureScore,
      floodExposureScore: report.scores.floodExposureScore,
      climateDisruptionScore: report.scores.climateDisruptionScore,
      inFloodZone: report.inFloodZone,
      floodZoneName: report.floodZoneName,
    },
    population: report.population
      ? {
          seniorsPercent: report.population.seniorsPercent,
          lowIncomePercent: report.population.lowIncomePercent,
          renterPercent: report.population.renterPercent,
          populationVulnerabilityScore: report.population.populationVulnerabilityScore,
        }
      : null,
    diversity: {
      outdoorVendors: report.vendors.outdoor,
      indoorVendors: report.vendors.indoor,
      ratio: report.vendors.ratio,
      diversityScore: report.scores.diversity,
    },
    overall: {
      score: report.scores.overall,
      stars: report.stars.overall,
    },
  });

  const handleDownload = () => {
    if (!item?.report) return;
    const blob = new Blob([JSON.stringify(buildDownloadReport(item.report), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.name}-report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] text-white p-6">Loading…</div>
    );
  }

  if (error || !item || !item.report) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] text-white p-6 flex flex-col gap-4">
        <button
          onClick={() => navigate("/saved-locations")}
          className="bg-[#2a2a3e] p-3 rounded-2xl w-fit"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <p className="text-red-300">
          {error ?? "This saved location has no stored report."}
        </p>
      </div>
    );
  }

  const report = item.report;
  const outdoor = report.vendors?.outdoor ?? item.outdoor ?? 0;
  const indoor = report.vendors?.indoor ?? item.indoor ?? 0;
  const ratio = report.vendors?.ratio ?? null;
  const ratioNote =
    ratio === null
      ? outdoor > 0
        ? "No indoor vendors — outdoor only"
        : "No vendors found"
      : ratio < 0.5
        ? "Heavily indoor-dependent"
        : ratio > 2
          ? "Mostly outdoor sources"
          : "Balanced mix";

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      <div className="flex items-center gap-3 px-4 pt-10 pb-4">
        <button
          onClick={() => navigate("/saved-locations")}
          className="bg-[#2a2a3e] p-3 rounded-2xl"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold truncate">{item.name}</h1>
          <p className="text-xs text-white/50">
            Saved {new Date(item.createdAt).toLocaleDateString()}
            {item.radius ? ` · ${item.radius} m radius` : ""}
          </p>
        </div>
      </div>

      <div className="px-4 pb-10 flex flex-col gap-4">
        <div className="bg-[#2a2a3e] rounded-2xl p-4 text-sm leading-relaxed">
          <p className="text-xs uppercase tracking-wide text-white/40 mb-2">
            Summary
          </p>
          {summary ? (
            <p className="text-white/90">{summary}</p>
          ) : summaryLoading ? (
            <p className="text-white/50">Generating summary…</p>
          ) : (
            <p className="text-white/50">No summary available.</p>
          )}
        </div>

        <div className="bg-[#2a2a3e] rounded-2xl p-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-white/40 text-xs">Neighbourhood</p>
            <p className="font-medium">{report.neighbourhood ?? "—"}</p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Coordinates</p>
            <p className="font-medium">
              {report.coords
                ? `${report.coords.lat.toFixed(4)}, ${report.coords.lng.toFixed(4)}`
                : typeof item.lat === "number" && typeof item.lng === "number"
                  ? `${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}`
                  : "—"}
            </p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Radius</p>
            <p className="font-medium">
              {report.radiusM ? `${report.radiusM} m` : item.radius ? `${item.radius} m` : "—"}
            </p>
          </div>
          <div>
            <p className="text-white/40 text-xs">In flood zone</p>
            <p className="font-medium">
              {report.inFloodZone
                ? `Yes${report.floodZoneName ? ` (${report.floodZoneName})` : ""}`
                : "No"}
            </p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Seniors</p>
            <p className="font-medium">{fmtPct(report.population?.seniorsPercent)}</p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Low income</p>
            <p className="font-medium">{fmtPct(report.population?.lowIncomePercent)}</p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Renters</p>
            <p className="font-medium">{fmtPct(report.population?.renterPercent)}</p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Outdoor / Indoor vendors</p>
            <p className="font-medium">
              {outdoor} / {indoor}
            </p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Heat score</p>
            <p className="font-medium">{fmtScore(report.scores?.heatExposureScore)}</p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Flood score</p>
            <p className="font-medium">{fmtScore(report.scores?.floodExposureScore)}</p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Climate disruption</p>
            <p className="font-medium">
              {fmtScore(report.scores?.climateDisruptionScore)}
            </p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Population vulnerability</p>
            <p className="font-medium">
              {fmtScore(report.population?.populationVulnerabilityScore)}
            </p>
          </div>
        </div>

        <div className="result-panel-container">
          <div className="result-panel-header">
            <span className="report-area-label">
              Report Area: {report.neighbourhood ?? "Unknown"}
            </span>
          </div>
          <hr />
          <div className="climate-disurbance">
            <span className="climate-disturbance-label label">
              Climate Disturbance
            </span>
            <div className="heatwave-container sub-container">
              <p>Heatwave</p>
              <span>{renderStars(report.stars?.heat ?? 0)}</span>
            </div>
            <div className="flood-container sub-container">
              <p>Flood</p>
              <span>{renderStars(report.stars?.flood ?? 0)}</span>
            </div>
          </div>

          <div className="population">
            <span className="population-label label">Population</span>
            <div className="senior-container sub-container">
              <p>Seniors</p>
              <span>{renderStars(report.stars?.population ?? 0)}</span>
            </div>
            <div className="income-container sub-container">
              <p>Income</p>
              <span>
                {renderStars(
                  report.population
                    ? Math.round(report.population.lowIncomeScore / 20)
                    : 0,
                )}
              </span>
            </div>
            <div className="handicap-container sub-container">
              <p>Renters</p>
              <span>
                {renderStars(
                  report.population
                    ? Math.round(report.population.renterScore / 20)
                    : 0,
                )}
              </span>
            </div>
          </div>

          <div className="food-diversity">
            <span className="food-diversity-label label">Food Diversity</span>
            <div className="ratio-container sub-container">
              <p>Outdoor - Indoor Ratio</p>
              <span>{renderStars(report.stars?.diversity ?? 0)}</span>
            </div>
            <div className="ratio-container sub-container">
              <p style={{ fontSize: "12px", color: "#888" }}>{ratioNote}</p>
              <span style={{ fontSize: "12px" }}>
                {outdoor} / {indoor}
              </span>
            </div>
          </div>

          <div className="overall">
            <div className="overall-container">
              <p className="overall-label label">
                Overall Vulnerability Rating
              </p>
              <span>{renderStars(report.stars?.overall ?? 0)}</span>
            </div>
          </div>

          <div className="button-container">
            <button className="download-button" onClick={handleDownload}>
              Download JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
