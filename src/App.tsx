import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { EmergencyReset } from "@/components/EmergencyReset";
import { LoadingFallback } from "@/components/LoadingFallback";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { PWABannerProvider } from "@/contexts/PWABannerContext";
import { PushNotificationListener } from "@/components/PushNotificationListener";
import { NotificationPermissionPrompt } from "@/components/NotificationPermissionPrompt";
import { GlobalSecurityProvider } from "@/components/GlobalSecurityProvider";
import { ConnectionIndicator } from "@/components/ConnectionIndicator";
import { OfflineSyncIndicator } from "@/components/OfflineSyncIndicator";
import { MaintenanceProvider } from "@/contexts/MaintenanceContext";
import { MaintenanceGuard } from "@/components/MaintenanceGuard";

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
import RegisterDriverPromoFree from "./pages/RegisterDriverPromoFree";
import RegistrationSuccess from "./pages/RegistrationSuccess";
import PioneerTest from "./pages/PioneerTest";
import NotFound from "./pages/NotFound";
import GuestBooking from "./pages/GuestBooking";
import GuestBookingTracking from "./pages/GuestBookingTracking";
import RegisterCourseInvitation from "./pages/RegisterCourseInvitation";
import RegisterGuestClient from "./pages/RegisterGuestClient";
import RegisterClient from "./pages/RegisterClient";
import RegisterCongressDriver from "./pages/RegisterCongressDriver";
import PioneerPayment from "./pages/PioneerPayment";
import OurValues from "./pages/OurValues";
import DriverWelcome from "./pages/DriverWelcome";
import MentionsLegales from "./pages/MentionsLegales";
import SafeMode from "./pages/SafeMode";
import NfcPlatePage from "./pages/NfcPlatePage";
import NfcPlateOrderSuccess from "./pages/NfcPlateOrderSuccess";
import TrackNfcOrder from "./pages/TrackNfcOrder";
import Tarifs from "./pages/Tarifs";
import { SafeModeIndicator } from "@/components/SafeModeIndicator";

// Legacy migration pages
const LegacyMigration = lazy(() => import("./pages/chauffeur/LegacyMigration"));
const MigrationSuccess = lazy(() => import("./pages/chauffeur/MigrationSuccess"));
const TrialExpiredSubscribe = lazy(() => import("./pages/chauffeur/TrialExpiredSubscribe"));

// Lazy load heavy dashboards and authenticated pages
const DriverDashboard = lazy(() => import("./pages/DriverDashboard"));
const DriverCreateCourse = lazy(() => import("./pages/DriverCreateCourse"));
const DriverCreateDirectCourse = lazy(() => import("./pages/DriverCreateDirectCourse"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const CreateCourse = lazy(() => import("./pages/CreateCourse"));
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
const ImmediateRide = lazy(() => import("./pages/ImmediateRide"));

const App = () => (
  <QueryClientProvider client={queryClient}>
    <GlobalSecurityProvider>
      <BrowserRouter>
        <AuthProvider>
          <MaintenanceProvider>
            <PWABannerProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                
                <PWAInstallBanner />
                <PushNotificationListener />
                <NotificationPermissionPrompt />
                <EmergencyReset />
                <ConnectionIndicator />
                <OfflineSyncIndicator />
                <MaintenanceGuard>
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
              <Route path="/register-driver-promo" element={<RegisterDriverPromoFree />} />
              <Route path="/registration-success" element={<RegistrationSuccess />} />
              <Route path="/pioneer-test" element={<PioneerTest />} />
              <Route path="/reservation-rapide/:driverId" element={<GuestBooking />} />
              <Route path="/reservation-suivi/:token" element={<GuestBookingTracking />} />
              <Route path="/register-course-invitation" element={<RegisterCourseInvitation />} />
              <Route path="/register-client" element={<RegisterClient />} />
              <Route path="/inscription-client" element={<RegisterGuestClient />} />
              <Route path="/inscription-congres" element={<RegisterCongressDriver />} />
              <Route path="/pioneer-payment" element={<PioneerPayment />} />
              <Route path="/nos-valeurs" element={<OurValues />} />
              <Route path="/driver-welcome" element={<DriverWelcome />} />
              <Route path="/mentions-legales" element={<MentionsLegales />} />
              <Route path="/safe-mode" element={<SafeMode />} />
              <Route path="/plaque-nfc" element={<NfcPlatePage />} />
              <Route path="/plaque-nfc/success" element={<NfcPlateOrderSuccess />} />
              <Route path="/suivi-plaque-nfc" element={<TrackNfcOrder />} />
              <Route path="/tarifs" element={<Tarifs />} />
              <Route path="/course-immediate" element={
                <Suspense fallback={<LoadingFallback />}>
                  <ImmediateRide />
                </Suspense>
              } />
              
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
                path="/driver/create-direct-course"
                element={
                  <ProtectedRoute allowedRoles={["driver"]} requireValidatedDriver>
                    <Suspense fallback={<LoadingFallback />}>
                      <ErrorBoundary>
                        <DriverCreateDirectCourse />
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
                path="/driver-dashboard/direct-course-creation"
                element={
                  <ProtectedRoute allowedRoles={["driver"]} requireValidatedDriver>
                    <Suspense fallback={<LoadingFallback />}>
                      <ErrorBoundary>
                        <DriverCreateDirectCourse />
                      </ErrorBoundary>
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              {/* Redirection de l'ancienne route /driver-pending-validation vers le dashboard */}
              <Route
                path="/driver-pending-validation"
                element={<Navigate to="/driver-dashboard" replace />}
              />
              {/* Routes de migration legacy Stripe */}
              <Route
                path="/chauffeur/migration"
                element={
                  <ProtectedRoute allowedRoles={["driver"]}>
                    <Suspense fallback={<LoadingFallback />}>
                      <LegacyMigration />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chauffeur/migration-success"
                element={
                  <ProtectedRoute allowedRoles={["driver"]}>
                    <Suspense fallback={<LoadingFallback />}>
                      <MigrationSuccess />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              {/* Route pour s'abonner après la fin de l'essai gratuit */}
              <Route
                path="/chauffeur/s-abonner"
                element={
                  <ProtectedRoute allowedRoles={["driver"]}>
                    <Suspense fallback={<LoadingFallback />}>
                      <TrialExpiredSubscribe />
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
              {/* Routes pour notifications - accessible à driver, client et admin */}
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute allowedRoles={["driver", "client", "admin"]}>
                    <Suspense fallback={<LoadingFallback />}>
                      <Notifications />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notification-settings"
                element={
                  <ProtectedRoute allowedRoles={["driver", "client", "admin"]}>
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
              
              {/* Redirections des anciennes routes company/fleet vers accueil */}
              <Route path="/register-company" element={<Navigate to="/" replace />} />
              <Route path="/register-fleet" element={<Navigate to="/" replace />} />
              <Route path="/devenir-gestionnaire-flotte" element={<Navigate to="/" replace />} />
              <Route path="/register-driver-fleet" element={<Navigate to="/" replace />} />
              <Route path="/flotte/:id" element={<Navigate to="/" replace />} />
              <Route path="/register-client-fleet" element={<Navigate to="/" replace />} />
              <Route path="/inscription-client-flotte" element={<Navigate to="/" replace />} />
              <Route path="/register-employee" element={<Navigate to="/" replace />} />
              <Route path="/company-partnership/:code" element={<Navigate to="/" replace />} />
              <Route path="/suivi-course-entreprise" element={<Navigate to="/" replace />} />
              <Route path="/join-company" element={<Navigate to="/" replace />} />
              <Route path="/fleet-client-dashboard" element={<Navigate to="/" replace />} />
              <Route path="/create-fleet-course" element={<Navigate to="/" replace />} />
              <Route path="/fleet-driver-dashboard" element={<Navigate to="/" replace />} />
              <Route path="/company-dashboard" element={<Navigate to="/" replace />} />
              <Route path="/company-employee-dashboard" element={<Navigate to="/" replace />} />
              <Route path="/create-company-course" element={<Navigate to="/" replace />} />
              <Route path="/fleet-dashboard" element={<Navigate to="/" replace />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
            </ErrorBoundary>
            </MaintenanceGuard>
            <SafeModeIndicator />
          </TooltipProvider>
          </PWABannerProvider>
          </MaintenanceProvider>
        </AuthProvider>
      </BrowserRouter>
    </GlobalSecurityProvider>
  </QueryClientProvider>
);

export default App;
