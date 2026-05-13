import "./ResultPanel.css";

export default function resultPanel() {
  return (
    <div className="result-panel-container">
      <div className="result-panel-header">
        <span className="report-area-label">Report Area:</span>
        <button className="close-button">X</button>
      </div>
      <hr></hr>

      <div className="climate-disurbance">
        <span className="climate-disturbance-label label">
          Climate Disturbance
        </span>
        <div className="heatwave-container sub-container">
          <p>Heatwave</p>
          <span>★★★★★</span>
        </div>
        <div className="flood-container sub-container">
          <p>Flood</p>
          <span>★★★★★</span>
        </div>
      </div>

      <div className="population">
        <span className="population-label label">Population</span>
        <div className="senior-container sub-container">
          <p>Seniors</p>
          <span>★★★★★</span>
        </div>
        <div className="income-container sub-container">
          <p>Income</p>
          <span>★★★★★</span>
        </div>
        <div className="handicap-container sub-container">
          <p>Handicap</p>
          <span>★★★★★</span>
        </div>
        <div className="married-container sub-container">
          <p>Married Status</p>
          <span>★★★★★</span>
        </div>
      </div>

      <div className="food-diversity">
        <span className="food-diversity-label label">Food Diversity</span>
        <div className="ratio-container sub-container">
          <p>Outdoor - Indoor Ratio</p>
          <span>3.2</span>
        </div>
      </div>

      <div className="overall">
        <div className="overall-container">
          <p className="overall-label label">Overall Vulnerability Rating</p>
          <span>★★★★★</span>
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
