import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  ArrowRight, ArrowLeft, Users, MapPin, Car, FileText, 
  Send, Check, Loader2, Building2
} from "lucide-react";
import { EmployeeSelectionStep } from "./EmployeeSelectionStep";
import { CourseDetailsStep } from "./CourseDetailsStep";
import { DriverSelectionStep } from "./DriverSelectionStep";
import { QuotesReviewStep } from "./QuotesReviewStep";
import { BookingConfirmationStep } from "./BookingConfirmationStep";

interface CompanyCourseBookingWizardProps {
  companyId: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export type WizardStep = "employee" | "details" | "drivers" | "quotes" | "confirmation";

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

const STEPS: { key: WizardStep; label: string; icon: React.ElementType }[] = [
  { key: "employee", label: "Collaborateur", icon: Users },
  { key: "details", label: "Trajet", icon: MapPin },
  { key: "drivers", label: "Chauffeurs", icon: Car },
  { key: "quotes", label: "Devis", icon: FileText },
  { key: "confirmation", label: "Confirmation", icon: Check },
];

export function CompanyCourseBookingWizard({ companyId, onClose, onSuccess }: CompanyCourseBookingWizardProps) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<WizardStep>("employee");
  const [requestId, setRequestId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CourseFormData>({
    employeeId: null,
    isGuestEmployee: false,
    guestEmployeeName: "",
    guestEmployeePhone: "",
    guestEmployeeEmail: "",
    pickupAddress: "",
    pickupCoordinates: null,
    destinationAddress: "",
    destinationCoordinates: null,
    scheduledDate: "",
    passengersCount: "1",
    notes: "",
    paymentMethod: "not_specified",
  });

  const [selectedDrivers, setSelectedDrivers] = useState<SelectedDriver[]>([]);
  const [generatedQuotes, setGeneratedQuotes] = useState<GeneratedQuote[]>([]);

  const currentStepIndex = STEPS.findIndex(s => s.key === currentStep);

  const canGoNext = () => {
    switch (currentStep) {
      case "employee":
        return formData.employeeId || (formData.isGuestEmployee && formData.guestEmployeeName && formData.guestEmployeePhone);
      case "details":
        return formData.pickupAddress && formData.destinationAddress && formData.scheduledDate;
      case "drivers":
        return selectedDrivers.length > 0;
      case "quotes":
        return generatedQuotes.some(q => q.selected);
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
              queryClient.invalidateQueries({ queryKey: ["company-course-requests"] });
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

        {currentStep !== "confirmation" && (
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
