import "./ResultPanel.css";
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

  if (!report) {
    navigate("/map");
    return null;
  }

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
        />
        <button className="save-button">Save</button>
      </div>
    </div>
  );
}
