import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import MapPage from "./pages/MapPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import AccountPage from "./pages/AccountPage";
import SavedLocationsPage from "./pages/SavedLocationsPage";
import SavedLocationDetailPage from "./pages/SavedLocationDetailPage";
import ResultPanel from "./components/ResultPanel";

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
