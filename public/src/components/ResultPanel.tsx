import "./ResultPanel.css";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface ReportData {
  neighbourhood: string;
  seniorsPercent: number;
  lowIncomePercent: number;
  renterPercent: number;
  populationVulnerabilityScore: number;
  heatExposureScore: number;
  floodExposureScore: number;
  inFloodZone: boolean;
  floodZoneName: string | null;
  climateDisruptionScore: number;
}

function scoreToStars(score: number): string {
  const stars = Math.round((score / 100) * 5);
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

export default function ResultPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const report = location.state?.report as ReportData | undefined;
  const outdoor = (location.state?.outdoor as number) ?? 0;
  const indoor = (location.state?.indoor as number) ?? 0;
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
    const name = areaName.trim() || report.neighbourhood;
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
        credentials: "include",
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
      if (res.status === 401) {
        navigate("/login");
        return;
      }
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
    const filename = areaName.trim() || report.neighbourhood;
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ratio = indoor > 0 ? outdoor / indoor : null;
  const outdoorIndoorRatio =
    ratio === null
      ? outdoor > 0
        ? "∞"
        : "N/A"
      : ratio < 0.1
        ? ratio.toFixed(3)
        : ratio.toFixed(1);

  return (
    <div className="result-panel-container">
      <div className="result-panel-header">
        <span className="report-area-label">
          Report Area: {report.neighbourhood}
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
          <span>{scoreToStars(report.heatExposureScore)}</span>
        </div>
        <div className="flood-container sub-container">
          <p>Flood</p>
          <span>{scoreToStars(report.floodExposureScore)}</span>
        </div>
      </div>

      <div className="population">
        <span className="population-label label">Population</span>
        <div className="senior-container sub-container">
          <p>Seniors</p>
          <span>{scoreToStars(report.seniorsPercent * 2)}</span>
        </div>
        <div className="income-container sub-container">
          <p>Income</p>
          <span>{scoreToStars(report.lowIncomePercent * 2)}</span>
        </div>
        <div className="handicap-container sub-container">
          <p>Renters</p>
          <span>{scoreToStars(report.renterPercent * 2)}</span>
        </div>
      </div>

      <div className="food-diversity">
        <span className="food-diversity-label label">Food Diversity</span>
        <div className="ratio-container sub-container">
          <p>Outdoor - Indoor Ratio</p>
          <span>{outdoorIndoorRatio}</span>
        </div>
      </div>

      <div className="overall">
        <div className="overall-container">
          <p className="overall-label label">Overall Vulnerability Rating</p>
          <span>{scoreToStars(report.populationVulnerabilityScore)}</span>
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
            ? "Saving…"
            : saveState === "saved"
              ? "Saved ✓"
              : "Save"}
        </button>
        <button className="download-button" onClick={handleDownload}>
          Download JSON
        </button>
      </div>
      {saveState === "saved" && (
        <button
          className="view-saved-button"
          onClick={() => navigate("/saved-locations")}
        >
          View saved locations
        </button>
      )}
      {saveError && <p className="save-error">{saveError}</p>}
    </div>
  );
}
