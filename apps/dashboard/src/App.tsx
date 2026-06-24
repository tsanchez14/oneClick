import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import DemoLayout from "./layouts/DemoLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import OnboardingPage from "./pages/OnboardingPage";
import AgendaPage from "./pages/AgendaPage";
import ServiciosPage from "./pages/ServiciosPage";
import ProfesionalesPage from "./pages/ProfesionalesPage";
import InvitacionPage from "./pages/InvitacionPage";
import ReportesPage from "./pages/ReportesPage";
import ConfiguracionPage from "./pages/ConfiguracionPage";
import PublicBookingPage from "./pages/PublicBookingPage";
import DemoBookingPage from "./pages/DemoBookingPage";
import { SupabaseDataProvider } from "./providers/SupabaseDataProvider";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/invitacion" element={<InvitacionPage />} />
      <Route
        path="/onboarding"
        element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>}
      />

      {/* Protected dashboard — wrapped in SupabaseDataProvider */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <SupabaseDataProvider>
              <DashboardLayout />
            </SupabaseDataProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<AgendaPage />} />
        <Route path="servicios" element={<ServiciosPage />} />
        <Route path="profesionales" element={<ProfesionalesPage />} />
        <Route path="reportes" element={<ReportesPage />} />
        <Route path="configuracion" element={<ConfiguracionPage />} />
      </Route>

      {/* Demo booking page (public) */}
      <Route path="/demo" element={<DemoBookingPage />} />

      {/* Demo dashboard — DemoLayout injects DemoProvider + DemoDataProvider */}
      <Route path="/demo/dashboard" element={<DemoLayout />}>
        <Route index element={<AgendaPage />} />
        <Route path="servicios" element={<ServiciosPage />} />
        <Route path="profesionales" element={<ProfesionalesPage />} />
        <Route path="reportes" element={<ReportesPage />} />
        <Route path="configuracion" element={<ConfiguracionPage />} />
      </Route>

      {/* Public booking page — MUST be last to avoid catching /demo */}
      <Route path="/:slug" element={<PublicBookingPage />} />
    </Routes>
  );
}
