import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Chauffeurs from "./pages/Chauffeurs";
import ChauffeurLanding from "./pages/ChauffeurLanding";
import ChauffeurProfile from "./pages/ChauffeurProfile";
import DriverDashboard from "./pages/DriverDashboard";
import DriverCreateCourse from "./pages/DriverCreateCourse";
import ClientDashboard from "./pages/ClientDashboard";
import RegisterClientQR from "./pages/RegisterClientQR";
import RegisterClientDriver from "./pages/RegisterClientDriver";
import AdminDashboard from "./pages/AdminDashboard";
import CreateCourse from "./pages/CreateCourse";
import CreateTestAccounts from "./pages/CreateTestAccounts";
import RegisterDriver from "./pages/RegisterDriver";
import RegistrationSuccess from "./pages/RegistrationSuccess";
import Notifications from "./pages/Notifications";
import ClientProfileView from "./pages/ClientProfileView";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
           <Route path="/chauffeurs" element={<Chauffeurs />} />
           <Route path="/devenir-chauffeur" element={<ChauffeurLanding />} />
           <Route path="/chauffeur/:id" element={<ChauffeurProfile />} />
            <Route path="/register-client-qr" element={<RegisterClientQR />} />
            <Route path="/register-client-driver" element={<RegisterClientDriver />} />
            <Route path="/register-driver" element={<RegisterDriver />} />
            <Route path="/registration-success" element={<RegistrationSuccess />} />
            <Route path="/create-course" element={<CreateCourse />} />
            <Route path="/create-test-accounts" element={<CreateTestAccounts />} />
            <Route
              path="/driver/create-course"
              element={
                <ProtectedRoute allowedRoles={["driver"]}>
                  <DriverCreateCourse />
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver-dashboard"
              element={
                <ProtectedRoute allowedRoles={["driver"]}>
                  <DriverDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client-dashboard"
              element={
                <ProtectedRoute allowedRoles={["client"]}>
                  <ClientDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute allowedRoles={["driver", "client", "admin"]}>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client-profile/:clientId"
              element={
                <ProtectedRoute allowedRoles={["driver"]}>
                  <ClientProfileView />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
