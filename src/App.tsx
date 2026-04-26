import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AnimatedRoutes } from "@/components/AnimatedRoutes";
import { AuthProvider } from "@/hooks/useAuth";
import { PremiumProvider } from "@/hooks/usePremium";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { EmergencyReset } from "@/components/EmergencyReset";
import { LoadingFallback } from "@/components/LoadingFallback";
import { PushNotificationListener } from "@/components/PushNotificationListener";
import { NotificationPermissionPrompt } from "@/components/NotificationPermissionPrompt";
import { GlobalSecurityProvider } from "@/components/GlobalSecurityProvider";
import { ConnectionIndicator } from "@/components/ConnectionIndicator";

import { MaintenanceProvider } from "@/contexts/MaintenanceContext";
import { MaintenanceGuard } from "@/components/MaintenanceGuard";
import { AutoDriverAvailabilitySync } from "@/components/driver/AutoDriverAvailabilitySync";
import { GlobalRideOverlay } from "@/components/GlobalRideOverlay";
import { NativePushRegistrar } from "@/components/NativePushRegistrar";
import { DriverBackgroundGPS } from "@/components/DriverBackgroundGPS";
import { DriverDeepLinkHandler } from "@/components/DriverDeepLinkHandler";

// Eager load only critical pages (landing + 404)
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";


// Lazy load ALL other pages
const Login = lazy(() => import("./pages/Login"));
const Chauffeurs = lazy(() => import("./pages/Chauffeurs"));
const ChauffeurLanding = lazy(() => import("./pages/ChauffeurLanding"));
const ChauffeurProfile = lazy(() => import("./pages/ChauffeurProfile"));
const RegisterClientQR = lazy(() => import("./pages/RegisterClientQR"));
const RegisterClientDriver = lazy(() => import("./pages/RegisterClientDriver"));
const RegisterDriver = lazy(() => import("./pages/RegisterDriver"));
const RegisterDriverPromoFree = lazy(() => import("./pages/RegisterDriverPromoFree"));
const RegistrationSuccess = lazy(() => import("./pages/RegistrationSuccess"));
const SignupChoice = lazy(() => import("./pages/SignupChoice"));
const OAuthOnboarding = lazy(() => import("./pages/OAuthOnboarding"));

const GuestBooking = lazy(() => import("./pages/GuestBooking"));
const GuestBookingTracking = lazy(() => import("./pages/GuestBookingTracking"));
const RegisterCourseInvitation = lazy(() => import("./pages/RegisterCourseInvitation"));
const RegisterGuestClient = lazy(() => import("./pages/RegisterGuestClient"));
const RegisterClient = lazy(() => import("./pages/RegisterClient"));
const PioneerPayment = lazy(() => import("./pages/PioneerPayment"));
const OurValues = lazy(() => import("./pages/OurValues"));
const CommentCaMarche = lazy(() => import("./pages/CommentCaMarche"));
const Contact = lazy(() => import("./pages/Contact"));
const DriverWelcome = lazy(() => import("./pages/DriverWelcome"));
const MentionsLegales = lazy(() => import("./pages/MentionsLegales"));
const DeleteAccount = lazy(() => import("./pages/DeleteAccount"));
const SafeMode = lazy(() => import("./pages/SafeMode"));
const NfcPlatePage = lazy(() => import("./pages/NfcPlatePage"));
const NfcPlateOrderSuccess = lazy(() => import("./pages/NfcPlateOrderSuccess"));
const TrackNfcOrder = lazy(() => import("./pages/TrackNfcOrder"));
const Tarifs = lazy(() => import("./pages/Tarifs"));
const ImmediateRide = lazy(() => import("./pages/ImmediateRide"));
const ClientRideTracking = lazy(() => import("./pages/ClientRideTracking"));

// Legacy migration pages
const LegacyMigration = lazy(() => import("./pages/chauffeur/LegacyMigration"));
const MigrationSuccess = lazy(() => import("./pages/chauffeur/MigrationSuccess"));
const TrialExpiredSubscribe = lazy(() => import("./pages/chauffeur/TrialExpiredSubscribe"));

// Authenticated pages
const DriverDashboard = lazy(() => import("./pages/DriverDashboard"));
const DriverCreateCourse = lazy(() => import("./pages/DriverCreateCourse"));
const DriverCreateDirectCourse = lazy(() => import("./pages/DriverCreateDirectCourse"));
const DriverCreateQuote = lazy(() => import("./pages/DriverCreateQuote"));
const QuoteAcceptance = lazy(() => import("./pages/QuoteAcceptance"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

const Notifications = lazy(() => import("./pages/Notifications"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const ClientProfileView = lazy(() => import("./pages/ClientProfileView"));
const RGPDData = lazy(() => import("./pages/RGPDData"));
const ApkHealthCheck = lazy(() => import("./pages/ApkHealthCheck"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const CancellationPolicy = lazy(() => import("./pages/CancellationPolicy"));
const DriverPartnerSearch = lazy(() => import("./pages/DriverPartnerSearch"));
const Permissions = lazy(() => import("./pages/Permissions"));
const GpsDiagnostic = lazy(() => import("./pages/GpsDiagnostic"));

const App = () => (
  <QueryClientProvider client={queryClient}>
    <GlobalSecurityProvider>
      <BrowserRouter>
        <AuthProvider>
          <PremiumProvider>
          <MaintenanceProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                
                <PushNotificationListener />
                <NotificationPermissionPrompt />
                <EmergencyReset />
                <ConnectionIndicator />
                
                <AutoDriverAvailabilitySync />
                <GlobalRideOverlay />
                <NativePushRegistrar />
                <DriverBackgroundGPS />
                <DriverDeepLinkHandler />
                <MaintenanceGuard>
                <ErrorBoundary>
                <AnimatedRoutes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Suspense fallback={<LoadingFallback />}><Login /></Suspense>} />
              <Route path="/signup" element={<Suspense fallback={<LoadingFallback />}><SignupChoice /></Suspense>} />
              <Route path="/oauth-onboarding" element={<Suspense fallback={<LoadingFallback />}><OAuthOnboarding /></Suspense>} />
              <Route path="/chauffeurs" element={<Suspense fallback={<LoadingFallback />}><Chauffeurs /></Suspense>} />
              <Route path="/devenir-chauffeur" element={<Suspense fallback={<LoadingFallback />}><ChauffeurLanding /></Suspense>} />
              <Route path="/chauffeur/:id" element={<Suspense fallback={<LoadingFallback />}><ChauffeurProfile /></Suspense>} />
              <Route path="/register-client-qr" element={<Suspense fallback={<LoadingFallback />}><RegisterClientQR /></Suspense>} />
              <Route path="/register-client-driver" element={<Suspense fallback={<LoadingFallback />}><RegisterClientDriver /></Suspense>} />
              <Route path="/register-driver" element={<Suspense fallback={<LoadingFallback />}><RegisterDriver /></Suspense>} />
              <Route path="/register-driver-promo" element={<Suspense fallback={<LoadingFallback />}><RegisterDriverPromoFree /></Suspense>} />
              <Route path="/registration-success" element={<Suspense fallback={<LoadingFallback />}><RegistrationSuccess /></Suspense>} />
              
              <Route path="/reservation-rapide/:driverId" element={<Suspense fallback={<LoadingFallback />}><GuestBooking /></Suspense>} />
              <Route path="/reservation-suivi/:token" element={<Suspense fallback={<LoadingFallback />}><GuestBookingTracking /></Suspense>} />
              <Route path="/suivi/:token" element={<Suspense fallback={<LoadingFallback />}><GuestBookingTracking /></Suspense>} />
              <Route path="/devis/:token" element={<Suspense fallback={<LoadingFallback />}><QuoteAcceptance /></Suspense>} />
              <Route path="/register-course-invitation" element={<Suspense fallback={<LoadingFallback />}><RegisterCourseInvitation /></Suspense>} />
              <Route path="/register-client" element={<Suspense fallback={<LoadingFallback />}><RegisterClient /></Suspense>} />
              <Route path="/inscription-client" element={<Suspense fallback={<LoadingFallback />}><RegisterGuestClient /></Suspense>} />
              <Route path="/inscription-congres" element={<Navigate to="/register-driver-promo" replace />} />
              <Route path="/pioneer-payment" element={<Suspense fallback={<LoadingFallback />}><PioneerPayment /></Suspense>} />
              <Route path="/nos-valeurs" element={<Suspense fallback={<LoadingFallback />}><OurValues /></Suspense>} />
              <Route path="/comment-ca-marche" element={<Suspense fallback={<LoadingFallback />}><CommentCaMarche /></Suspense>} />
              <Route path="/driver-welcome" element={<Suspense fallback={<LoadingFallback />}><DriverWelcome /></Suspense>} />
              <Route path="/mentions-legales" element={<Suspense fallback={<LoadingFallback />}><MentionsLegales /></Suspense>} />
              <Route path="/delete-account" element={<Suspense fallback={<LoadingFallback />}><DeleteAccount /></Suspense>} />
              <Route path="/supprimer-compte" element={<Navigate to="/delete-account" replace />} />
              <Route path="/contact" element={<Suspense fallback={<LoadingFallback />}><Contact /></Suspense>} />
              <Route path="/cgu" element={<Navigate to="/terms-of-service" replace />} />
              <Route path="/safe-mode" element={<Suspense fallback={<LoadingFallback />}><SafeMode /></Suspense>} />
              <Route path="/plaque-nfc" element={<Suspense fallback={<LoadingFallback />}><NfcPlatePage /></Suspense>} />
              <Route path="/plaque-nfc/success" element={<Suspense fallback={<LoadingFallback />}><NfcPlateOrderSuccess /></Suspense>} />
              <Route path="/suivi-plaque-nfc" element={<Suspense fallback={<LoadingFallback />}><TrackNfcOrder /></Suspense>} />
              <Route path="/tarifs" element={<Suspense fallback={<LoadingFallback />}><Tarifs /></Suspense>} />
              <Route path="/course-immediate" element={<Suspense fallback={<LoadingFallback />}><ImmediateRide /></Suspense>} />
              <Route path="/suivi-course/:courseId" element={<Suspense fallback={<LoadingFallback />}><ClientRideTracking /></Suspense>} />
              
              {/* Legacy /create-course removed: registered clients now use the unified flow at /chauffeurs */}
              <Route path="/create-course" element={<Navigate to="/chauffeurs" replace />} />
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
                path="/driver/create-quote"
                element={
                  <ProtectedRoute allowedRoles={["driver"]} requireValidatedDriver>
                    <Suspense fallback={<LoadingFallback />}>
                      <ErrorBoundary>
                        <DriverCreateQuote />
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
                path="/permissions"
                element={
                  <ProtectedRoute allowedRoles={["driver", "client", "admin"]}>
                    <Suspense fallback={<LoadingFallback />}>
                      <Permissions />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/diagnostic-gps"
                element={
                  <ProtectedRoute allowedRoles={["driver", "admin"]}>
                    <Suspense fallback={<LoadingFallback />}>
                      <GpsDiagnostic />
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
              <Route path="/apk-health" element={
                <Suspense fallback={<LoadingFallback />}>
                  <ApkHealthCheck />
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
              <Route path="/politique-annulation" element={
                <Suspense fallback={<LoadingFallback />}>
                  <CancellationPolicy />
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
            </AnimatedRoutes>
            </ErrorBoundary>
            </MaintenanceGuard>
            
          </TooltipProvider>
          </MaintenanceProvider>
          </PremiumProvider>
        </AuthProvider>
      </BrowserRouter>
    </GlobalSecurityProvider>
  </QueryClientProvider>
);

export default App;
