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
import ChauffeurProfile from "./pages/ChauffeurProfile";
import DriverDashboard from "./pages/DriverDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import RegisterClientQR from "./pages/RegisterClientQR";
import RegisterClientDriver from "./pages/RegisterClientDriver";
import AdminDashboard from "./pages/AdminDashboard";
import CreateCourse from "./pages/CreateCourse";
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
          <Route path="/chauffeur/:id" element={<ChauffeurProfile />} />
           <Route path="/register-client" element={<RegisterClientQR />} />
           <Route path="/register-client-driver" element={<RegisterClientDriver />} />
           <Route path="/create-course" element={<CreateCourse />} />
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
                <ProtectedRoute>
                  <AdminDashboard />
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
