import { Routes, Route } from "react-router-dom";
import TermsConsentModal from "./components/TermsConsentModal";
import Home from "./pages/Home";
import Login from "./pages/Login";
import LiveAlerts from "./pages/LiveAlerts";
import ResponseTeams from "./pages/ResponseTeams";
import Shelters from "./pages/Shelters";
import Donate from "./pages/Donate";
import AlertSetup from "./pages/AlertSetup";
import EarlyWarning from "./pages/EarlyWarning";
import Resources from "./pages/Resources";
import Strategy from "./pages/Strategy";
import Terms from "./pages/Terms";
import InfrastructureResilience from "./pages/InfrastructureResilience";
import CascadingFailureEngine from "./pages/CascadingFailureEngine";

export default function App() {
  return (
    <>
      <TermsConsentModal />
      <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/cascading-failure-engine" element={<CascadingFailureEngine />} />
      <Route path="/resilience-network" element={<InfrastructureResilience />} />
      <Route path="/login" element={<Login />} />
      <Route path="/early-warning" element={<EarlyWarning />} />
      <Route path="/live-alerts" element={<LiveAlerts />} />
      <Route path="/response-teams" element={<ResponseTeams />} />
      <Route path="/shelters" element={<Shelters />} />
      <Route path="/donate" element={<Donate />} />
      <Route path="/alert-setup" element={<AlertSetup />} />
      <Route path="/strategy" element={<Strategy />} />
      <Route path="/resources" element={<Resources />} />
      <Route path="/terms" element={<Terms />} />
    </Routes>
    </>
  );
}
