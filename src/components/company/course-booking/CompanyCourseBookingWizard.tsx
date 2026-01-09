import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  ArrowRight, ArrowLeft, Users, MapPin, Car, FileText, 
  Send, Check, Loader2, Building2, Euro
} from "lucide-react";
import { EmployeeSelectionStep } from "./EmployeeSelectionStep";
import { CourseDetailsStep } from "./CourseDetailsStep";
import { DriverSelectionStep } from "./DriverSelectionStep";
import { QuotesReviewStep } from "./QuotesReviewStep";
import { BookingConfirmationStep } from "./BookingConfirmationStep";
import { FleetConfirmationStep } from "./FleetConfirmationStep";
import { FleetQuoteStep, PriceDetails } from "./FleetQuoteStep";

interface CompanyCourseBookingWizardProps {
  companyId: string;
  existingRequest?: any; // For resending a refused request
  resumeStep?: WizardStep; // Step to resume from
  onClose?: () => void;
  onSuccess?: () => void;
}

export type WizardStep = "employee" | "details" | "drivers" | "quotes" | "confirmation" | "fleet_quote" | "fleet_confirmation";

export interface CourseFormData {
  // Employee
  employeeId: string | null;
  isGuestEmployee: boolean;
  guestEmployeeName: string;
  guestEmployeePhone: string;
  guestEmployeeEmail: string;
  
  // Course details
  pickupAddress: string;
  pickupCoordinates: { latitude: number; longitude: number } | null;
  destinationAddress: string;
  destinationCoordinates: { latitude: number; longitude: number } | null;
  scheduledDate: string;
  passengersCount: string;
  notes: string;
  paymentMethod: string;
}

export interface SelectedDriver {
  driverId: string;
  name: string;
  companyName?: string;
  rating?: number;
  vehicleInfo?: string;
  photoUrl?: string;
}

export interface GeneratedQuote {
  id: string;
  driverId: string;
  driverName: string;
  driverPhoto?: string;
  vehicleInfo?: string;
  totalPrice: number;
  distanceKm: number;
  durationMinutes: number;
  status: string;
  selected: boolean;
}

const STEPS_DRIVERS: { key: WizardStep; label: string; icon: React.ElementType }[] = [
  { key: "employee", label: "Collaborateur", icon: Users },
  { key: "details", label: "Trajet", icon: MapPin },
  { key: "drivers", label: "Chauffeurs", icon: Car },
  { key: "quotes", label: "Devis", icon: FileText },
  { key: "confirmation", label: "Confirmation", icon: Check },
];

const STEPS_FLEET: { key: WizardStep; label: string; icon: React.ElementType }[] = [
  { key: "employee", label: "Collaborateur", icon: Users },
  { key: "details", label: "Trajet", icon: MapPin },
  { key: "drivers", label: "Partenaire", icon: Building2 },
  { key: "fleet_quote", label: "Devis", icon: Euro },
  { key: "fleet_confirmation", label: "Confirmation", icon: Check },
];

export function CompanyCourseBookingWizard({ companyId, existingRequest, resumeStep, onClose, onSuccess }: CompanyCourseBookingWizardProps) {
  const queryClient = useQueryClient();
  
  // Selection mode: drivers or fleet manager
  const [selectionMode, setSelectionMode] = useState<"drivers" | "fleet">("drivers");
  const [selectedFleetManagerId, setSelectedFleetManagerId] = useState<string | null>(null);
  
  // Determine starting step: resumeStep > existingRequest logic > default
  const getInitialStep = (): WizardStep => {
    if (resumeStep) return resumeStep;
    if (existingRequest) return "drivers";
    return "employee";
  };
  
  const [currentStep, setCurrentStep] = useState<WizardStep>(getInitialStep());
  const [requestId, setRequestId] = useState<string | null>(existingRequest?.id || null);

  const [formData, setFormData] = useState<CourseFormData>({
    employeeId: existingRequest?.employee_id || null,
    isGuestEmployee: existingRequest?.is_guest_employee || false,
    guestEmployeeName: existingRequest?.guest_employee_name || "",
    guestEmployeePhone: existingRequest?.guest_employee_phone || "",
    guestEmployeeEmail: existingRequest?.guest_employee_email || "",
    pickupAddress: existingRequest?.pickup_address || "",
    pickupCoordinates: existingRequest?.pickup_latitude && existingRequest?.pickup_longitude 
      ? { latitude: existingRequest.pickup_latitude, longitude: existingRequest.pickup_longitude } 
      : null,
    destinationAddress: existingRequest?.destination_address || "",
    destinationCoordinates: existingRequest?.destination_latitude && existingRequest?.destination_longitude 
      ? { latitude: existingRequest.destination_latitude, longitude: existingRequest.destination_longitude } 
      : null,
    scheduledDate: existingRequest?.scheduled_date || "",
    passengersCount: existingRequest?.passengers_count?.toString() || "1",
    notes: existingRequest?.notes || "",
    paymentMethod: existingRequest?.payment_method_requested || "not_specified",
  });

  const [selectedDrivers, setSelectedDrivers] = useState<SelectedDriver[]>([]);
  
  // Fleet quote state
  const [fleetGeneratedPrice, setFleetGeneratedPrice] = useState<number | null>(null);
  const [fleetPriceDetails, setFleetPriceDetails] = useState<PriceDetails | null>(null);
  
  // Pre-load generated quotes if resuming from quotes or confirmation step
  const [generatedQuotes, setGeneratedQuotes] = useState<GeneratedQuote[]>(() => {
    if (existingRequest?.quotesWithProfiles && (resumeStep === "quotes" || resumeStep === "confirmation")) {
      return existingRequest.quotesWithProfiles
        .filter((q: any) => q.status !== "cancelled" && q.status !== "refused")
        .map((q: any) => ({
          id: q.id,
          driverId: q.driver_id,
          driverName: q.profile?.full_name || q.driver?.company_name || "Chauffeur",
          driverPhoto: q.profile?.profile_photo_url,
          vehicleInfo: "",
          totalPrice: q.total_price,
          distanceKm: q.distance_km || 0,
          durationMinutes: q.duration_minutes || 0,
          status: q.status || "pending",
          selected: true, // Pre-select existing quotes
        }));
    }
    return [];
  });

  // Choose the right steps based on selection mode
  const STEPS = selectionMode === "fleet" ? STEPS_FLEET : STEPS_DRIVERS;
  const currentStepIndex = STEPS.findIndex(s => s.key === currentStep);

  const canGoNext = () => {
    switch (currentStep) {
      case "employee":
        return formData.employeeId || (formData.isGuestEmployee && formData.guestEmployeeName && formData.guestEmployeePhone);
      case "details":
        return formData.pickupAddress && formData.destinationAddress && formData.scheduledDate;
      case "drivers":
        // In fleet mode, need a fleet manager selected; in drivers mode, need drivers
        return selectionMode === "fleet" ? !!selectedFleetManagerId : selectedDrivers.length > 0;
      case "quotes":
        return generatedQuotes.some(q => q.selected);
      case "fleet_quote":
        return fleetGeneratedPrice !== null && fleetGeneratedPrice > 0;
      default:
        return true;
    }
  };

  const goNext = () => {
    const idx = STEPS.findIndex(s => s.key === currentStep);
    if (idx < STEPS.length - 1) {
      setCurrentStep(STEPS[idx + 1].key);
    }
  };

  const goBack = () => {
    const idx = STEPS.findIndex(s => s.key === currentStep);
    if (idx > 0) {
      setCurrentStep(STEPS[idx - 1].key);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case "employee":
        return (
          <EmployeeSelectionStep
            companyId={companyId}
            formData={formData}
            setFormData={setFormData}
          />
        );
      case "details":
        return (
          <CourseDetailsStep
            formData={formData}
            setFormData={setFormData}
          />
        );
      case "drivers":
        return (
          <DriverSelectionStep
            companyId={companyId}
            selectedDrivers={selectedDrivers}
            setSelectedDrivers={setSelectedDrivers}
            selectedFleetManagerId={selectedFleetManagerId}
            setSelectedFleetManagerId={setSelectedFleetManagerId}
            selectionMode={selectionMode}
            setSelectionMode={setSelectionMode}
          />
        );
      case "quotes":
        return (
          <QuotesReviewStep
            companyId={companyId}
            formData={formData}
            selectedDrivers={selectedDrivers}
            requestId={requestId}
            setRequestId={setRequestId}
            generatedQuotes={generatedQuotes}
            setGeneratedQuotes={setGeneratedQuotes}
          />
        );
      case "confirmation":
        return (
          <BookingConfirmationStep
            requestId={requestId}
            generatedQuotes={generatedQuotes}
            formData={formData}
            companyId={companyId}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["company-course-requests", companyId] });
              if (onSuccess) onSuccess();
              if (onClose) onClose();
            }}
          />
        );
      case "fleet_quote":
        return (
          <FleetQuoteStep
            companyId={companyId}
            formData={formData}
            fleetManagerId={selectedFleetManagerId!}
            generatedPrice={fleetGeneratedPrice}
            setGeneratedPrice={setFleetGeneratedPrice}
            priceDetails={fleetPriceDetails}
            setPriceDetails={setFleetPriceDetails}
          />
        );
      case "fleet_confirmation":
        return (
          <FleetConfirmationStep
            companyId={companyId}
            formData={formData}
            fleetManagerId={selectedFleetManagerId!}
            estimatedPrice={fleetGeneratedPrice}
            priceDetails={fleetPriceDetails}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["company-course-requests", companyId] });
              if (onSuccess) onSuccess();
              if (onClose) onClose();
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-between overflow-x-auto pb-2">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = currentStep === step.key;
          const isPast = currentStepIndex > idx;
          
          return (
            <div key={step.key} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : isPast
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}>
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <ArrowRight className="w-4 h-4 mx-2 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {renderStep()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between gap-4">
        <Button
          variant="outline"
          onClick={currentStepIndex === 0 ? onClose : goBack}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {currentStepIndex === 0 ? "Annuler" : "Retour"}
        </Button>

        {currentStep !== "confirmation" && currentStep !== "fleet_confirmation" && (
          <Button
            onClick={goNext}
            disabled={!canGoNext()}
            className="gap-2"
          >
            Continuer
            <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
