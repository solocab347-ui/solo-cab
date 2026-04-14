import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ArrowRight,
  ArrowLeft,
  Camera,
  User,
  Briefcase,
  MapPin,
  Car,
  CheckCircle2,
  Sparkles,
  Loader2,
} from "lucide-react";
import { SingleProfilePhotoUpload } from "../onboarding/SingleProfilePhotoUpload";
import { SectorSelector } from "../SectorSelector";
import { ServicesSelector } from "../ServicesSelector";
import { EquipmentSelector } from "../vehicles/EquipmentSelector";
import { VehicleCategorySelector } from "../vehicles/VehicleCategorySelector";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfileCompletionWizardProps {
  driverProfile: any;
  userId: string;
  onComplete: () => void;
}

interface WizardData {
  profilePhotoUrl: string | null;
  displayDriverName: boolean;
  displayCompanyName: boolean;
  serviceDescription: string;
  workingSectors: string[];
  servicesOffered: string[];
  vehicleCategories: string[];
  vehicleEquipment: string[];
}

const STEPS = [
  { id: "photo", title: "Photo", icon: Camera },
  { id: "identity", title: "Identité", icon: User },
  { id: "description", title: "Présentation", icon: Briefcase },
  { id: "sectors", title: "Zones", icon: MapPin },
  { id: "services", title: "Services", icon: Briefcase },
  { id: "vehicle", title: "Véhicule", icon: Car },
];

export function ProfileCompletionWizard({ driverProfile, userId, onComplete }: ProfileCompletionWizardProps) {
  const driver = driverProfile?.driver;
  // Restore persisted step
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = driver?.wizard_current_step;
    return typeof saved === "number" && saved >= 0 && saved < STEPS.length ? saved : 0;
  });
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const savingRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDataRef = useRef<WizardData | null>(null);

  const [data, setData] = useState<WizardData>({
    profilePhotoUrl: driver?.card_photo_url || driverProfile?.profile_photo_url || null,
    displayDriverName: driver?.display_driver_name ?? true,
    displayCompanyName: driver?.display_company_name ?? false,
    serviceDescription: driver?.service_description || "",
    workingSectors: driver?.working_sectors || [],
    servicesOffered: driver?.services_offered || [],
    vehicleCategories: driver?.vehicle_categories || [],
    vehicleEquipment: driver?.vehicle_equipment || [],
  });

  // Keep latest data in ref for beforeunload flush
  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  // Immediate save (no debounce) - used on step transitions
  const saveToDatabase = useCallback(async (dataToSave: WizardData, step?: number) => {
    if (!driver?.id || savingRef.current) return;
    savingRef.current = true;
    setAutoSaving(true);
    try {
      const updatePayload: Record<string, any> = {
        profile_photo_url: dataToSave.profilePhotoUrl,
        card_photo_url: dataToSave.profilePhotoUrl,
        display_driver_name: dataToSave.displayDriverName,
        display_company_name: dataToSave.displayCompanyName,
        service_description: dataToSave.serviceDescription,
        working_sectors: dataToSave.workingSectors,
        services_offered: dataToSave.servicesOffered,
        vehicle_categories: dataToSave.vehicleCategories,
        vehicle_equipment: dataToSave.vehicleEquipment,
      };
      if (typeof step === "number") {
        updatePayload.wizard_current_step = step;
      }

      const { error } = await supabase
        .from("drivers")
        .update(updatePayload)
        .eq("id", driver.id);

      if (error) throw error;

      if (dataToSave.profilePhotoUrl) {
        await supabase
          .from("profiles")
          .update({ profile_photo_url: dataToSave.profilePhotoUrl })
          .eq("id", userId);
      }
    } catch (err) {
      console.error("Auto-save error:", err);
    } finally {
      savingRef.current = false;
      setAutoSaving(false);
    }
  }, [driver?.id, userId]);

  // Debounced save for field-level changes
  const debouncedSave = useCallback((dataToSave: WizardData) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveToDatabase(dataToSave);
    }, 1500);
  }, [saveToDatabase]);

  const updateData = useCallback((updates: Partial<WizardData>) => {
    setData(prev => {
      const newData = { ...prev, ...updates };
      debouncedSave(newData);
      return newData;
    });
  }, [debouncedSave]);

  // Flush pending save on unmount / page leave
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (saveTimeoutRef.current && latestDataRef.current && driver?.id) {
        clearTimeout(saveTimeoutRef.current);
        // Use sendBeacon for reliable save on page close
        const payload = JSON.stringify({
          profile_photo_url: latestDataRef.current.profilePhotoUrl,
          card_photo_url: latestDataRef.current.profilePhotoUrl,
          display_driver_name: latestDataRef.current.displayDriverName,
          display_company_name: latestDataRef.current.displayCompanyName,
          service_description: latestDataRef.current.serviceDescription,
          working_sectors: latestDataRef.current.workingSectors,
          services_offered: latestDataRef.current.servicesOffered,
          vehicle_categories: latestDataRef.current.vehicleCategories,
          vehicle_equipment: latestDataRef.current.vehicleEquipment,
        });
        // Fallback: trigger the save
        saveToDatabase(latestDataRef.current);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        // Flush on unmount
        if (latestDataRef.current) {
          saveToDatabase(latestDataRef.current);
        }
      }
    };
  }, [driver?.id, saveToDatabase]);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: return !!data.profilePhotoUrl;
      case 1: return data.displayDriverName || data.displayCompanyName;
      case 2: return data.serviceDescription.length >= 20;
      case 3: return data.workingSectors.length > 0;
      case 4: return data.servicesOffered.length > 0;
      case 5: return data.vehicleCategories.length > 0;
      default: return false;
    }
  };

  // Save immediately on step change and persist current step
  const handleNext = useCallback(async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    const nextStep = currentStep + 1;
    await saveToDatabase(data, nextStep);
    setCurrentStep(nextStep);
  }, [data, currentStep, saveToDatabase]);

  const handleBack = useCallback(async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    const prevStep = currentStep - 1;
    await saveToDatabase(data, prevStep);
    setCurrentStep(prevStep);
  }, [data, currentStep, saveToDatabase]);

  const handleFinish = async () => {
    if (!driver?.id) return;
    setSaving(true);
    try {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      const { error } = await supabase
        .from("drivers")
        .update({
          profile_photo_url: data.profilePhotoUrl,
          card_photo_url: data.profilePhotoUrl,
          display_driver_name: data.displayDriverName,
          display_company_name: data.displayCompanyName,
          service_description: data.serviceDescription,
          working_sectors: data.workingSectors,
          services_offered: data.servicesOffered,
          vehicle_categories: data.vehicleCategories,
          vehicle_equipment: data.vehicleEquipment,
          public_profile_enabled: true,
          onboarding_profile_completed: true,
          wizard_current_step: STEPS.length, // Mark as fully done
        })
        .eq("id", driver.id);

      if (error) throw error;

      if (data.profilePhotoUrl) {
        await supabase
          .from("profiles")
          .update({ profile_photo_url: data.profilePhotoUrl })
          .eq("id", userId);
      }

      toast.success("Profil complété avec succès ! 🎉");
      onComplete();
    } catch (err) {
      console.error("Error saving profile:", err);
      toast.error("Erreur lors de la sauvegarde. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const driverName = driverProfile?.full_name || "Chauffeur";

  return (
    <div className="min-h-[80vh] flex flex-col max-w-lg mx-auto px-2">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-lg font-bold text-foreground">Complétez votre profil</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Chaque étape est obligatoire pour activer votre profil public
        </p>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">
            Étape {currentStep + 1}/{STEPS.length}
            {autoSaving && (
              <span className="ml-2 inline-flex items-center gap-1 text-primary">
                <Loader2 className="w-3 h-3 animate-spin" />
                Sauvegarde...
              </span>
            )}
          </span>
          <span className="text-xs font-medium">{STEPS[currentStep].title}</span>
        </div>
        <Progress value={progress} className="h-1.5" />
        <div className="flex justify-between mt-2">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const done = i < currentStep;
            const current = i === currentStep;
            return (
              <div key={step.id} className={`flex flex-col items-center ${i <= currentStep ? 'text-primary' : 'text-muted-foreground/40'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  done ? 'bg-primary text-primary-foreground' : current ? 'bg-primary/20 border-2 border-primary' : 'bg-muted'
                }`}>
                  {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card className="flex-1 p-4 sm:p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            {currentStep === 0 && (
              <div className="space-y-4">
                <div className="text-center">
                  <Camera className="w-8 h-8 text-primary mx-auto mb-2" />
                  <h2 className="text-base font-bold">Votre photo de profil</h2>
                  <p className="text-xs text-muted-foreground">Elle sera visible par vos clients sur votre profil public et votre carte chauffeur</p>
                </div>
                <SingleProfilePhotoUpload
                  currentPhotoUrl={data.profilePhotoUrl}
                  userId={userId}
                  driverName={driverName}
                  onPhotoUpdate={(url) => updateData({ profilePhotoUrl: url })}
                />
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="text-center">
                  <User className="w-8 h-8 text-primary mx-auto mb-2" />
                  <h2 className="text-base font-bold">Identité affichée</h2>
                  <p className="text-xs text-muted-foreground">Choisissez ce qui sera visible sur votre profil</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                    <div>
                      <Label className="text-sm font-medium">Afficher mon nom</Label>
                      <p className="text-xs text-muted-foreground">{driverName}</p>
                    </div>
                    <Switch checked={data.displayDriverName} onCheckedChange={(v) => updateData({ displayDriverName: v })} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                    <div>
                      <Label className="text-sm font-medium">Afficher mon entreprise</Label>
                      <p className="text-xs text-muted-foreground">{driver?.company_name || "Non défini"}</p>
                    </div>
                    <Switch checked={data.displayCompanyName} onCheckedChange={(v) => updateData({ displayCompanyName: v })} />
                  </div>
                </div>
                {!(data.displayDriverName || data.displayCompanyName) && (
                  <p className="text-xs text-destructive text-center">Vous devez afficher au moins votre nom ou votre entreprise</p>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="text-center">
                  <Briefcase className="w-8 h-8 text-primary mx-auto mb-2" />
                  <h2 className="text-base font-bold">Votre présentation</h2>
                  <p className="text-xs text-muted-foreground">Présentez-vous aux clients potentiels</p>
                </div>
                <Textarea
                  value={data.serviceDescription}
                  onChange={(e) => updateData({ serviceDescription: e.target.value })}
                  placeholder="Chauffeur VTC professionnel avec 5 ans d'expérience, véhicule haut de gamme, bilingue français/anglais..."
                  rows={4}
                  className="resize-none text-sm"
                />
                <p className={`text-xs ${data.serviceDescription.length >= 20 ? 'text-muted-foreground' : 'text-amber-500'}`}>
                  {data.serviceDescription.length}/20 caractères minimum
                </p>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="text-center">
                  <MapPin className="w-8 h-8 text-primary mx-auto mb-2" />
                  <h2 className="text-base font-bold">Zones d'activité</h2>
                  <p className="text-xs text-muted-foreground">Sélectionnez vos secteurs de prise en charge</p>
                </div>
                <SectorSelector
                  selectedSectors={data.workingSectors}
                  onChange={(sectors) => updateData({ workingSectors: sectors })}
                />
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="text-center">
                  <Briefcase className="w-8 h-8 text-primary mx-auto mb-2" />
                  <h2 className="text-base font-bold">Services proposés</h2>
                  <p className="text-xs text-muted-foreground">Quels types de services offrez-vous ?</p>
                </div>
                <ServicesSelector
                  selectedServices={data.servicesOffered}
                  onChange={(services) => updateData({ servicesOffered: services })}
                />
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="text-center">
                  <Car className="w-8 h-8 text-primary mx-auto mb-2" />
                  <h2 className="text-base font-bold">Votre véhicule</h2>
                  <p className="text-xs text-muted-foreground">Catégorie et équipements de votre véhicule</p>
                </div>
                <VehicleCategorySelector
                  selectedCategories={data.vehicleCategories}
                  onChange={(cats) => updateData({ vehicleCategories: cats })}
                />
                <div className="pt-2">
                  <Label className="text-sm font-medium mb-2 block">Équipements (optionnel)</Label>
                  <EquipmentSelector
                    selectedEquipment={data.vehicleEquipment}
                    onChange={(eq) => updateData({ vehicleEquipment: eq })}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-4 pb-4">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0 || autoSaving}
          size="sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Précédent
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed() || autoSaving}
            size="sm"
          >
            {autoSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
            Suivant
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleFinish}
            disabled={!canProceed() || saving}
            size="sm"
            className="bg-gradient-to-r from-primary to-accent text-white"
          >
            {saving ? "Enregistrement..." : "Terminer ✨"}
          </Button>
        )}
      </div>
    </div>
  );
}
