import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { MapPin, Calendar, Users, CreditCard } from "lucide-react";
import { CourseFormData } from "./CompanyCourseBookingWizard";
import { CoursePaymentMethodSelector } from "@/components/shared/CoursePaymentMethodSelector";

interface CourseDetailsStepProps {
  formData: CourseFormData;
  setFormData: React.Dispatch<React.SetStateAction<CourseFormData>>;
}

export function CourseDetailsStep({ formData, setFormData }: CourseDetailsStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Détails du trajet
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Indiquez les adresses et informations de la course
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-600" />
            Point de départ *
          </Label>
          <AddressAutocomplete
            value={formData.pickupAddress}
            onChange={(address, coords) => {
              setFormData(prev => ({
                ...prev,
                pickupAddress: address,
                pickupCoordinates: coords || null,
              }));
            }}
            placeholder="Adresse de départ"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-600" />
            Point d'arrivée *
          </Label>
          <AddressAutocomplete
            value={formData.destinationAddress}
            onChange={(address, coords) => {
              setFormData(prev => ({
                ...prev,
                destinationAddress: address,
                destinationCoordinates: coords || null,
              }));
            }}
            placeholder="Adresse d'arrivée"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date et heure *
            </Label>
            <Input
              type="datetime-local"
              value={formData.scheduledDate}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Nombre de passagers *
            </Label>
            <Input
              type="number"
              min="1"
              max="8"
              value={formData.passengersCount}
              onChange={(e) => setFormData(prev => ({ ...prev, passengersCount: e.target.value }))}
            />
          </div>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg border border-border">
          <CoursePaymentMethodSelector
            value={formData.paymentMethod}
            onChange={(v) => setFormData(prev => ({ ...prev, paymentMethod: v }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Notes (optionnel)</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Instructions particulières, numéro de vol, etc."
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}
