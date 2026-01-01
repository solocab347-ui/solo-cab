import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { EmergencyReset } from "@/components/EmergencyReset";
import { LoadingFallback } from "@/components/LoadingFallback";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { PushNotificationListener } from "@/components/PushNotificationListener";
import { NotificationPermissionPrompt } from "@/components/NotificationPermissionPrompt";
import { GlobalLanguageSelector } from "@/components/GlobalLanguageSelector";

// Eager load public pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Chauffeurs from "./pages/Chauffeurs";
import ChauffeurLanding from "./pages/ChauffeurLanding";
import ChauffeurProfile from "./pages/ChauffeurProfile";
import RegisterClientQR from "./pages/RegisterClientQR";
import RegisterClientDriver from "./pages/RegisterClientDriver";
import RegisterDriver from "./pages/RegisterDriver";
import RegisterDriverPromo from "./pages/RegisterDriverPromo";
import RegistrationSuccess from "./pages/RegistrationSuccess";
import PioneerTest from "./pages/PioneerTest";
import NotFound from "./pages/NotFound";
import RegisterCompany from "./pages/RegisterCompany";
import RegisterFleetManager from "./pages/RegisterFleetManager";
import FleetManagerLanding from "./pages/FleetManagerLanding";
import GuestBooking from "./pages/GuestBooking";
import GuestBookingTracking from "./pages/GuestBookingTracking";
import RegisterDriverFleet from "./pages/RegisterDriverFleet";
import FleetPublicProfile from "./pages/FleetPublicProfile";
import RegisterClientFleet from "./pages/RegisterClientFleet";
import RegisterClientFleetInvitation from "./pages/RegisterClientFleetInvitation";
import RegisterCompanyEmployee from "./pages/RegisterCompanyEmployee";
import RegisterCourseInvitation from "./pages/RegisterCourseInvitation";
import CompanyPartnership from "./pages/CompanyPartnership";
// Lazy load heavy dashboards and authenticated pages
const FleetDriverDashboard = lazy(() => import("./pages/FleetDriverDashboard"));
const CompanyDashboard = lazy(() => import("./pages/CompanyDashboard"));
const CompanyEmployeeDashboard = lazy(() => import("./pages/CompanyEmployeeDashboard"));
const FleetManagerDashboard = lazy(() => import("./pages/FleetManagerDashboard"));
const FleetClientDashboard = lazy(() => import("./pages/FleetClientDashboard"));
const CreateCompanyCourse = lazy(() => import("./pages/CreateCompanyCourse"));

// Lazy load heavy dashboards and authenticated pages
const DriverDashboard = lazy(() => import("./pages/DriverDashboard"));
const DriverCreateCourse = lazy(() => import("./pages/DriverCreateCourse"));
const DriverPendingValidation = lazy(() => import("./pages/DriverPendingValidation"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const CreateCourse = lazy(() => import("./pages/CreateCourse"));
const CreateFleetCourse = lazy(() => import("./pages/CreateFleetCourse"));
const Notifications = lazy(() => import("./pages/Notifications"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const ClientProfileView = lazy(() => import("./pages/ClientProfileView"));
const RGPDData = lazy(() => import("./pages/RGPDData"));
const InstallPWA = lazy(() => import("./pages/InstallPWA"));
const CreateTestAccounts = lazy(() => import("./pages/CreateTestAccounts"));
const CreateParisDrivers = lazy(() => import("./pages/CreateParisDrivers"));
const UploadDriverPhotos = lazy(() => import("./pages/UploadDriverPhotos"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const DriverPartnerSearch = lazy(() => import("./pages/DriverPartnerSearch"));

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <GlobalLanguageSelector />
          <PWAInstallBanner />
          <PushNotificationListener />
          <NotificationPermissionPrompt />
          <EmergencyReset />
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/chauffeurs" element={<Chauffeurs />} />
              <Route path="/devenir-chauffeur" element={<ChauffeurLanding />} />
              <Route path="/chauffeur/:id" element={<ChauffeurProfile />} />
              <Route path="/register-client-qr" element={<RegisterClientQR />} />
              <Route path="/register-client-driver" element={<RegisterClientDriver />} />
              <Route path="/register-driver" element={<RegisterDriver />} />
              <Route path="/register-driver-promo" element={<RegisterDriverPromo />} />
              <Route path="/registration-success" element={<RegistrationSuccess />} />
              <Route path="/register-company" element={<RegisterCompany />} />
              <Route path="/register-fleet" element={<RegisterFleetManager />} />
              <Route path="/devenir-gestionnaire-flotte" element={<FleetManagerLanding />} />
              <Route path="/pioneer-test" element={<PioneerTest />} />
              <Route path="/reservation-rapide/:driverId" element={<GuestBooking />} />
              <Route path="/reservation-suivi/:token" element={<GuestBookingTracking />} />
              <Route path="/register-driver-fleet" element={<RegisterDriverFleet />} />
              <Route path="/flotte/:id" element={<FleetPublicProfile />} />
              <Route path="/register-client-fleet" element={<RegisterClientFleet />} />
              <Route path="/inscription-client-flotte" element={<RegisterClientFleetInvitation />} />
              <Route path="/register-employee" element={<RegisterCompanyEmployee />} />
              <Route path="/register-course-invitation" element={<RegisterCourseInvitation />} />
              <Route path="/company-partnership/:code" element={<CompanyPartnership />} />
              <Route
                path="/fleet-client-dashboard"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <Suspense fallback={<LoadingFallback />}>
                      <FleetClientDashboard />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create-fleet-course"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <Suspense fallback={<LoadingFallback />}>
                      <ErrorBoundary>
                        <CreateFleetCourse />
                      </ErrorBoundary>
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/fleet-driver-dashboard"
                element={
                  <ProtectedRoute allowedRoles={["driver"]}>
                    <Suspense fallback={<LoadingFallback />}>
                      <FleetDriverDashboard />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route path="/create-course" element={
                <ProtectedRoute allowedRoles={["client"]}>
                  <Suspense fallback={<LoadingFallback />}>
                    <ErrorBoundary>
                      <CreateCourse />
                    </ErrorBoundary>
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/create-test-accounts" element={
                <Suspense fallback={<LoadingFallback />}>
                  <CreateTestAccounts />
                </Suspense>
              } />
              <Route path="/create-paris-drivers" element={
                <Suspense fallback={<LoadingFallback />}>
                  <CreateParisDrivers />
                </Suspense>
              } />
              <Route path="/upload-driver-photos" element={
                <Suspense fallback={<LoadingFallback />}>
                  <UploadDriverPhotos />
                </Suspense>
              } />
              <Route
                path="/driver/create-course"
                element={
                  <ProtectedRoute allowedRoles={["driver"]} requireValidatedDriver>
                    <Suspense fallback={<LoadingFallback />}>
                      <ErrorBoundary>
                        <DriverCreateCourse />
                      </ErrorBoundary>
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/driver-dashboard"
                element={
                  <ProtectedRoute allowedRoles={["driver"]} requireValidatedDriver>
                    <Suspense fallback={<LoadingFallback />}>
                      <DriverDashboard />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/driver-pending-validation"
                element={
                  <ProtectedRoute allowedRoles={["driver"]}>
                    <Suspense fallback={<LoadingFallback />}>
                      <DriverPendingValidation />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client-dashboard"
                element={
                  <ProtectedRoute allowedRoles={["client"]}>
                    <Suspense fallback={<LoadingFallback />}>
                      <ClientDashboard />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-dashboard"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <Suspense fallback={<LoadingFallback />}>
                      <AdminDashboard />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/company-dashboard"
                element={
                  <ProtectedRoute allowedRoles={["company"]}>
                    <Suspense fallback={<LoadingFallback />}>
                      <CompanyDashboard />
                  </Suspense>
                </ProtectedRoute>
              }
              />
              <Route
                path="/create-company-course"
                element={
                  <ProtectedRoute allowedRoles={["company"]}>
                    <Suspense fallback={<LoadingFallback />}>
                      <ErrorBoundary>
                        <CreateCompanyCourse />
                      </ErrorBoundary>
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/fleet-dashboard"
                element={
                  <ProtectedRoute allowedRoles={["fleet_manager"]}>
                    <Suspense fallback={<LoadingFallback />}>
                      <FleetManagerDashboard />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              {/* Routes pour notifications - accessible à tous */}
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute allowedRoles={["driver", "client", "admin", "fleet_manager", "company"]}>
                    <Suspense fallback={<LoadingFallback />}>
                      <Notifications />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notification-settings"
                element={
                  <ProtectedRoute allowedRoles={["driver", "client", "admin", "fleet_manager", "company"]}>
                    <Suspense fallback={<LoadingFallback />}>
                      <NotificationSettings />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client-profile/:clientId"
                element={
                  <ProtectedRoute allowedRoles={["driver"]} requireValidatedDriver>
                    <Suspense fallback={<LoadingFallback />}>
                      <ClientProfileView />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              {/* Route RGPD - accessible à driver et client */}
              <Route
                path="/rgpd-data"
                element={
                  <ProtectedRoute allowedRoles={["driver", "client"]}>
                    <Suspense fallback={<LoadingFallback />}>
                      <RGPDData />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route path="/install" element={
                <Suspense fallback={<LoadingFallback />}>
                  <InstallPWA />
                </Suspense>
              } />
              <Route path="/privacy-policy" element={
                <Suspense fallback={<LoadingFallback />}>
                  <PrivacyPolicy />
                </Suspense>
              } />
              <Route path="/terms-of-service" element={
                <Suspense fallback={<LoadingFallback />}>
                  <TermsOfService />
                </Suspense>
              } />
              <Route
                path="/driver/partner-search"
                element={
                  <ProtectedRoute allowedRoles={["driver"]} requireValidatedDriver>
                    <Suspense fallback={<LoadingFallback />}>
                      <DriverPartnerSearch />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              {/* Alias route for driver-partner-search */}
              <Route
                path="/driver-partner-search"
                element={
                  <ProtectedRoute allowedRoles={["driver"]} requireValidatedDriver>
                    <Suspense fallback={<LoadingFallback />}>
                      <DriverPartnerSearch />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
