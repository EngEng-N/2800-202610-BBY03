import "../../css/ResultPanel.css";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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

function renderStars(count: number): string {
  const clamped = Math.max(0, Math.min(5, count));
  return "★".repeat(clamped) + "☆".repeat(5 - clamped);
}

export default function ResultPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const report = location.state?.report as ReportData | undefined;
  const outdoor = (location.state?.outdoor as number) ?? report?.vendors?.outdoor ?? 0;
  const indoor = (location.state?.indoor as number) ?? report?.vendors?.indoor ?? 0;
  const lat = location.state?.lat as number | undefined;
  const lng = location.state?.lng as number | undefined;
  const radius = location.state?.radius as number | undefined;

  const [areaName, setAreaName] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!report) {
    navigate("/map");
    return null;
  }

  const handleSave = async () => {
    if (!report || typeof lat !== "number" || typeof lng !== "number") {
      setSaveError("Missing location data.");
      setSaveState("error");
      return;
    }
    const name = areaName.trim() || report.neighbourhood || "Unnamed area";
    setSaveState("saving");
    setSaveError(null);
    try {
      let summary: string | null = null;
      try {
        const sumRes = await fetch("/api/summary", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            report: { ...report, outdoor, indoor, lat, lng, radius },
          }),
        });
        if (sumRes.ok) {
          const data = await sumRes.json();
          summary = data.summary ?? null;
        }
      } catch {
        // non-fatal: save without summary
      }

      const res = await fetch("/api/saved-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          lat,
          lng,
          radius,
          report,
          outdoor,
          indoor,
          summary,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error ?? "Could not save.");
        setSaveState("error");
        return;
      }
      setSaveState("saved");
    } catch {
      setSaveError("Network error. Try again.");
      setSaveState("error");
    }
  };

  const handleDownload = () => {
    const filename = areaName.trim() || report.neighbourhood || "report";
    const downloadReport = {
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
    };
    const blob = new Blob([JSON.stringify(downloadReport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ratio = report.vendors.ratio;
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
    <div className="result-panel-container">
      <div className="result-panel-header">
        <span className="report-area-label">
          Report Area: {report.neighbourhood ?? "Unknown"}
        </span>
        <button className="close-button" onClick={() => navigate("/map")}>
          X
        </button>
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
          <span>{renderStars(report.stars.population)}</span>
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
          <span>{renderStars(report.stars.diversity)}</span>
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
          <p className="overall-label label">Overall Vulnerability Rating</p>
          <span>{renderStars(report.stars.overall)}</span>
        </div>
      </div>

      <div className="button-container">
        <input
          type="text"
          placeholder="Enter area name"
          className="area-input"
          value={areaName}
          onChange={(e) => setAreaName(e.target.value)}
        />
        <button
          className="save-button"
          onClick={handleSave}
          disabled={saveState === "saving" || saveState === "saved"}
        >
          {saveState === "saving"
            ? "Saving..."
            : saveState === "saved"
              ? "Saved"
              : "Save"}
        </button>
        <button className="download-button" onClick={handleDownload}>
          Download JSON
        </button>
      </div>
      {saveState === "saved" && (
        <div className="save-feedback success">Location saved!</div>
      )}
      {saveState === "saved" && (
        <button
          className="view-saved-button"
          onClick={() => navigate("/saved-locations")}
        >
          View saved locations
        </button>
      )}
      {saveError && <div className="save-feedback error">{saveError}</div>}
    </div>
  );
}
