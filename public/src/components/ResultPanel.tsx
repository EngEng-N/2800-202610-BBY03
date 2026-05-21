import "./ResultPanel.css";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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

export default function ResultPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const report = location.state?.report as ReportData | undefined;
  const outdoor = (location.state?.outdoor as number) ?? 0;
  const indoor = (location.state?.indoor as number) ?? 0;

  const [areaName, setAreaName] = useState("");
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (!report) {
      navigate("/map");
    }
  }, [report, navigate]);

  if (!report) return null;

  const handleDownload = () => {
    const filename = (areaName.trim() || report.neighbourhood)
      .replace(/\s+/g, "-")
      .toLowerCase();

    const downloadReport = buildDownloadReport(
      report,
      areaName,
      outdoor,
      indoor,
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

  const ratio = indoor > 0 ? outdoor / indoor : null;

  const outdoorIndoorRatio =
    indoor === 0
      ? outdoor > 0
        ? "N/A"
        : "N/A"
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

  async function handleSave() {
    const trimmedName = areaName.trim();

    if (!trimmedName) {
      setSaveState("error");
      setSaveMessage("Please enter an area name before saving.");
      return;
    }

    setSaveState("saving");
    setSaveMessage("");

    try {
      const payload = {
        areaName: trimmedName,
        ...report,
        vendors: {
          outdoor,
          indoor,
        },
      };

      setTimeout(() => {
        setSaveState("success");
        setSaveMessage("Temporary save worked. Check console for payload.");
        setAreaName("");
      }, 500);
    } catch (error) {
      console.error(error);
      setSaveState("error");
      setSaveMessage("Temporary save failed.");
    }
  }

  console.log("REPORT DATA:", report);
  console.log("REPORT STARS:", report.stars);

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
          onChange={(e) => {
            setAreaName(e.target.value);
            if (saveState !== "idle") {
              setSaveState("idle");
              setSaveMessage("");
            }
          }}
        />

        <button
          className="save-button"
          onClick={handleSave}
          disabled={saveState === "saving"}
        >
          {saveState === "saving" ? "Saving..." : "Save"}
        </button>
        <button className="download-button" onClick={handleDownload}>
          Download JSON
        </button>
      </div>

      {saveMessage && (
        <p
          className={
            saveState === "success"
              ? "save-feedback success"
              : "save-feedback error"
          }
        >
          {saveMessage}
        </p>
      )}
    </div>
  );
}
