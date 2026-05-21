import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage.js";
import MapPage from "./pages/MapPage.js";
import LoginPage from "./pages/LoginPage.js";
import SignupPage from "./pages/SignupPage.js";
import AccountPage from "./pages/AccountPage.js";
import SavedLocationsPage from "./pages/SavedLocationsPage.js";
import SavedLocationDetailPage from "./pages/SavedLocationDetailPage.js";
import ResultPanel from "./pages/ResultPanel.js";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/map" element={<MapPage />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/saved-locations" element={<SavedLocationsPage />} />
      <Route path="/saved-locations/:id" element={<SavedLocationDetailPage />} />
      <Route path="/results" element={<ResultPanel />} />
    </Routes>
  );
}

export default App;
