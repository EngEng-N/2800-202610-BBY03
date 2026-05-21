import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "../components/ResultPanel.css";

interface ReportData {
  neighbourhood: string;
  coords: { lat: number; lng: number };
  radiusM: number;
  areaKm2: number;
  population: {
    seniorsPercent: number;
    lowIncomePercent: number;
    renterPercent: number;
    populationVulnerabilityScore: number;
  };
  vendors: {
    outdoor: number;
    indoor: number;
  };
  scores: {
    heatExposureScore: number;
    floodExposureScore: number;
    climateDisruptionScore: number;
    populationVulnerabilityScore: number;
    providerDiversityScore?: number;
    overallVulnerabilityScore?: number;
  };
  stars: {
    heat: number;
    flood: number;
    seniors: number;
    income: number;
    renters: number;
    diversity: number;
    overall: number;
  };
  inFloodZone: boolean;
  floodZoneName: string | null;
  createdAt?: string;
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

function renderStars(stars: number): string {
  const s = Math.max(0, Math.min(5, stars));
  return "★".repeat(s) + "☆".repeat(5 - s);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatScore(value?: number): string {
  return typeof value === "number" ? `${Math.round(value)}/100` : "N/A";
}

function buildDownloadReport(
  report: ReportData,
  areaName: string,
  outdoor: number,
  indoor: number,
) {
  const trimmedName = areaName.trim();
  const displayAreaName = trimmedName || report.neighbourhood;
  const ratio = indoor > 0 ? outdoor / indoor : null;

  const outdoorIndoorRatio =
    indoor === 0
      ? "N/A"
      : outdoor === 0
        ? "N/A"
        : ratio !== null && ratio < 0.1
          ? ratio.toFixed(3)
          : ratio !== null
            ? ratio.toFixed(1)
            : "N/A";

  const ratioNote =
    indoor === 0
      ? outdoor > 0
        ? "Only outdoor vendors were found in this area."
        : "No indoor or outdoor vendors were found in this area."
      : outdoor === 0
        ? "Only indoor vendors were found in this area."
        : "Both indoor and outdoor vendors were found in this area.";

  return {
    reportTitle: `${displayAreaName} Food Vulnerability Report`,
    generatedAt: new Date().toISOString(),

    area: {
      selectedAreaName: displayAreaName,
      neighbourhood: report.neighbourhood,
      coordinates: {
        latitude: report.coords.lat,
        longitude: report.coords.lng,
      },
      analysisRadiusMeters: report.radiusM,
      analysisAreaSquareKm: report.areaKm2,
    },

    climateDisturbance: {
      heatwave: {
        score: formatScore(report.scores.heatExposureScore),
        rating: renderStars(report.stars.heat),
      },
      flood: {
        inFloodZone: report.inFloodZone ? "Yes" : "No",
        floodZoneName: report.floodZoneName ?? "None",
        score: formatScore(report.scores.floodExposureScore),
        rating: renderStars(report.stars.flood),
      },
      climateDisruptionScore: formatScore(report.scores.climateDisruptionScore),
    },

    population: {
      seniors: {
        percentage: formatPercent(report.population.seniorsPercent),
        rating: renderStars(report.stars.seniors),
      },
      lowIncome: {
        percentage: formatPercent(report.population.lowIncomePercent),
        rating: renderStars(report.stars.income),
      },
      renters: {
        percentage: formatPercent(report.population.renterPercent),
        rating: renderStars(report.stars.renters),
      },
      populationVulnerabilityScore: formatScore(
        report.population.populationVulnerabilityScore,
      ),
    },

    foodDiversity: {
      outdoorVendors: outdoor,
      indoorVendors: indoor,
      outdoorIndoorRatio,
      ratioNote,
      providerDiversityScore: formatScore(report.scores.providerDiversityScore),
      diversityRating: renderStars(report.stars.diversity),
    },

    overallVulnerability: {
      overallScore: formatScore(report.scores.overallVulnerabilityScore),
      overallRating: renderStars(report.stars.overall),
    },
  };
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
        const res = await fetch("/api/saved-locations", {
          credentials: "include",
        });
        if (res.status === 401) {
          navigate("/login");
          return;
        }
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
  }, [id, navigate]);

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
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [item, summary, summaryLoading]);

  const handleDownload = () => {
    if (!item?.report) return;

    const filename = item.name.replace(/\s+/g, "-").toLowerCase();
    const downloadReport = buildDownloadReport(
      item.report,
      item.name,
      item.outdoor ?? 0,
      item.indoor ?? 0,
    );

    const blob = new Blob([JSON.stringify(downloadReport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-report.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
  const outdoor = item.outdoor ?? 0;
  const indoor = item.indoor ?? 0;
  const ratio = indoor > 0 ? outdoor / indoor : null;

  const outdoorIndoorRatio =
    indoor === 0
      ? "N/A"
      : outdoor === 0
        ? "N/A"
        : ratio !== null && ratio < 0.1
          ? ratio.toFixed(3)
          : ratio !== null
            ? ratio.toFixed(1)
            : "N/A";

  const ratioNote =
    indoor === 0
      ? outdoor > 0
        ? "Only outdoor vendors were found in this area."
        : "No indoor or outdoor vendors were found in this area."
      : outdoor === 0
        ? "Only indoor vendors were found in this area."
        : "";

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
            <p className="font-medium">{report.neighbourhood}</p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Coordinates</p>
            <p className="font-medium">
              {typeof item.lat === "number" && typeof item.lng === "number"
                ? `${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Radius</p>
            <p className="font-medium">
              {item.radius ? `${item.radius} m` : "—"}
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
            <p className="font-medium">
              {formatPercent(report.population.seniorsPercent)}
            </p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Low income</p>
            <p className="font-medium">
              {formatPercent(report.population.lowIncomePercent)}
            </p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Renters</p>
            <p className="font-medium">
              {formatPercent(report.population.renterPercent)}
            </p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Outdoor / Indoor vendors</p>
            <p className="font-medium">
              {outdoor} / {indoor}
            </p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Heat score</p>
            <p className="font-medium">
              {formatScore(report.scores.heatExposureScore)}
            </p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Flood score</p>
            <p className="font-medium">
              {formatScore(report.scores.floodExposureScore)}
            </p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Climate disruption</p>
            <p className="font-medium">
              {formatScore(report.scores.climateDisruptionScore)}
            </p>
          </div>
          <div>
            <p className="text-white/40 text-xs">Population vulnerability</p>
            <p className="font-medium">
              {formatScore(report.population.populationVulnerabilityScore)}
            </p>
          </div>
        </div>

        <div className="result-panel-container">
          <div className="result-panel-header">
            <span className="report-area-label">
              Report Area: {report.neighbourhood}
            </span>
          </div>
          <hr />

          <div className="climate-disurbance">
            <span className="climate-disturbance-label label">
              Climate Disturbance
            </span>
            <div className="heatwave-container sub-container">
              <p>Heatwave</p>
              <span>{renderStars(report.stars.heat)}</span>
            </div>
            <div className="flood-container sub-container">
              <p>Flood</p>
              <span>{renderStars(report.stars.flood)}</span>
            </div>
          </div>

          <div className="population">
            <span className="population-label label">Population</span>
            <div className="senior-container sub-container">
              <p>Seniors</p>
              <span>{renderStars(report.stars.seniors)}</span>
            </div>
            <div className="income-container sub-container">
              <p>Income</p>
              <span>{renderStars(report.stars.income)}</span>
            </div>
            <div className="handicap-container sub-container">
              <p>Renters</p>
              <span>{renderStars(report.stars.renters)}</span>
            </div>
          </div>

          <div className="food-diversity">
            <span className="food-diversity-label label">Food Diversity</span>
            <div className="ratio-container sub-container">
              <p>Outdoor - Indoor Ratio</p>
              <span>{outdoorIndoorRatio}</span>
            </div>
            {ratioNote && <p className="ratio-note">{ratioNote}</p>}
            <div className="ratio-container sub-container">
              <p>Diversity</p>
              <span>{renderStars(report.stars.diversity)}</span>
            </div>
          </div>

          <div className="overall">
            <div className="overall-container">
              <p className="overall-label label">
                Overall Vulnerability Rating
              </p>
              <span>{renderStars(report.stars.overall)}</span>
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
