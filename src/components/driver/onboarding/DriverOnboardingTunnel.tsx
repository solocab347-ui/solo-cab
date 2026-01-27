import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowRight, 
  ArrowLeft,
  Settings,
  User,
  FileText,
  Sparkles,
  CheckCircle2,
  Loader2,
  Target,
  Info
} from 'lucide-react';
import { OnboardingSettingsStep } from './OnboardingSettingsStep';
import { OnboardingProfileStep } from './OnboardingProfileStep';
import { OnboardingDocumentsStep } from './OnboardingDocumentsStep';
import { OnboardingCompleteStep } from './OnboardingCompleteStep';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logo from '@/assets/logo-solocab.png';

export interface OnboardingTunnelProps {
  driverId: string;
  userId: string;
  driverProfile: any;
  onComplete: () => void;
  initialStep?: number;
}

const STEPS = [
  { id: 'settings', title: 'Réglages', icon: Settings, description: 'Tarifs & Entreprise' },
  { id: 'profile', title: 'Profil', icon: User, description: 'Photo & Services' },
  { id: 'documents', title: 'Documents', icon: FileText, description: 'Pièces justificatives' },
  { id: 'complete', title: 'Terminé', icon: Sparkles, description: 'Accès complet' },
];

export function DriverOnboardingTunnel({ 
  driverId, 
  userId, 
  driverProfile,
  onComplete,
  initialStep = 0
}: OnboardingTunnelProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [saving, setSaving] = useState(false);
  const [stepData, setStepData] = useState({
    settings: {
      baseFare: driverProfile?.driver?.base_fare?.toString() || '',
      perKmRate: driverProfile?.driver?.per_km_rate?.toString() || '',
      hourlyRate: driverProfile?.driver?.hourly_rate?.toString() || '',
      minimumPrice: driverProfile?.driver?.minimum_price?.toString() || '0',
      maxPassengers: driverProfile?.driver?.max_passengers?.toString() || '4',
      tvaIncluded: driverProfile?.driver?.tva_included || false,
      companyName: driverProfile?.driver?.company_name || '',
      companyAddress: driverProfile?.driver?.company_address || '',
      siret: driverProfile?.driver?.siret || '',
      siren: driverProfile?.driver?.siren || '',
      tvaNumber: driverProfile?.driver?.tva_number || '',
      vehicleBrand: driverProfile?.driver?.vehicle_brand || '',
      vehicleYear: driverProfile?.driver?.vehicle_year?.toString() || '',
      vehicleColor: driverProfile?.driver?.vehicle_color || '',
      vehiclePlate: driverProfile?.driver?.vehicle_plate || '',
    },
    profile: {
      profilePhotoUrl: driverProfile?.profile_photo_url || driverProfile?.avatar_url || null,
      cardPhotoUrl: driverProfile?.driver?.card_photo_url || null,
      serviceDescription: driverProfile?.driver?.service_description || '',
      workingSectors: driverProfile?.driver?.working_sectors || [],
      vehicleEquipment: driverProfile?.driver?.vehicle_equipment || [],
      servicesOffered: driverProfile?.driver?.services_offered || [],
      vehicleCategories: driverProfile?.driver?.vehicle_category || [],
      displayDriverName: driverProfile?.driver?.display_driver_name !== false,
      displayCompanyName: driverProfile?.driver?.display_company_name || false,
      homeAddress: driverProfile?.driver?.home_address || '',
      homeCoordinates: driverProfile?.driver?.home_latitude && driverProfile?.driver?.home_longitude 
        ? { latitude: driverProfile.driver.home_latitude, longitude: driverProfile.driver.home_longitude }
        : null,
    },
    documents: {
      documentsStatus: driverProfile?.driver?.documents_status || 'pending',
    }
  });

  // Vérifier les étapes déjà complétées
  const [completedSteps, setCompletedSteps] = useState({
    settings: driverProfile?.driver?.onboarding_settings_completed || false,
    profile: driverProfile?.driver?.onboarding_profile_completed || false,
    documents: driverProfile?.driver?.onboarding_documents_completed || false,
  });

  // Validation de chaque étape
  const isSettingsValid = () => {
    const { baseFare, perKmRate, hourlyRate, companyName, companyAddress, siret, siren, vehicleBrand, vehiclePlate } = stepData.settings;
    return !!(baseFare && perKmRate && hourlyRate && companyName && companyAddress && (siret || siren) && vehicleBrand && vehiclePlate);
  };

  const isProfileValid = () => {
    const { profilePhotoUrl, serviceDescription, workingSectors, servicesOffered } = stepData.profile;
    return !!(profilePhotoUrl && serviceDescription && workingSectors.length > 0 && servicesOffered.length > 0);
  };

  const isDocumentsValid = () => {
    return stepData.documents.documentsStatus === 'submitted' || stepData.documents.documentsStatus === 'validated';
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return isSettingsValid();
      case 1: return isProfileValid();
      case 2: return isDocumentsValid();
      case 3: return true;
      default: return false;
    }
  };

  const updateStepData = (step: string, updates: any) => {
    setStepData(prev => ({
      ...prev,
      [step]: { ...prev[step as keyof typeof prev], ...updates }
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { settings } = stepData;
      const { error } = await supabase
        .from('drivers')
        .update({
          base_fare: settings.baseFare ? parseFloat(settings.baseFare) : null,
          per_km_rate: settings.perKmRate ? parseFloat(settings.perKmRate) : null,
          hourly_rate: settings.hourlyRate ? parseFloat(settings.hourlyRate) : null,
          minimum_price: settings.minimumPrice ? parseFloat(settings.minimumPrice) : 0,
          max_passengers: settings.maxPassengers ? parseInt(settings.maxPassengers) : 4,
          tva_included: settings.tvaIncluded,
          company_name: settings.companyName,
          company_address: settings.companyAddress,
          siret: settings.siret,
          siren: settings.siren,
          tva_number: settings.tvaNumber,
          vehicle_brand: settings.vehicleBrand,
          vehicle_year: settings.vehicleYear ? parseInt(settings.vehicleYear) : null,
          vehicle_color: settings.vehicleColor,
          vehicle_plate: settings.vehiclePlate,
          onboarding_settings_completed: true,
          onboarding_step: 'profile',
        })
        .eq('id', driverId);

      if (error) throw error;
      
      setCompletedSteps(prev => ({ ...prev, settings: true }));
      toast.success('Réglages enregistrés !');
      return true;
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Erreur lors de l\'enregistrement');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { profile } = stepData;
      
      // Update profile photo in profiles table
      if (profile.profilePhotoUrl) {
        await supabase
          .from('profiles')
          .update({ profile_photo_url: profile.profilePhotoUrl })
          .eq('id', userId);
      }

      // Update driver data
      const { error } = await supabase
        .from('drivers')
        .update({
          card_photo_url: profile.cardPhotoUrl,
          service_description: profile.serviceDescription,
          working_sectors: profile.workingSectors,
          vehicle_equipment: profile.vehicleEquipment,
          services_offered: profile.servicesOffered,
          vehicle_category: profile.vehicleCategories,
          display_driver_name: profile.displayDriverName,
          display_company_name: profile.displayCompanyName,
          home_address: profile.homeAddress,
          home_latitude: profile.homeCoordinates?.latitude || null,
          home_longitude: profile.homeCoordinates?.longitude || null,
          public_profile_enabled: true, // Activer le profil public automatiquement
          onboarding_profile_completed: true,
          onboarding_step: 'documents',
        })
        .eq('id', driverId);

      if (error) throw error;
      
      setCompletedSteps(prev => ({ ...prev, profile: true }));
      toast.success('Profil enregistré !');
      return true;
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error('Erreur lors de l\'enregistrement');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    let success = false;
    
    switch (currentStep) {
      case 0:
        success = await saveSettings();
        break;
      case 1:
        success = await saveProfile();
        break;
      case 2:
        // Documents are saved automatically via DriverDocuments component
        success = true;
        break;
      default:
        success = true;
    }

    if (success && currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('drivers')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          onboarding_step: 'complete',
        })
        .eq('id', driverId);

      if (error) throw error;
      
      toast.success('🎉 Bienvenue sur SoloCab ! Votre inscription est complète.');
      onComplete();
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      toast.error('Erreur lors de la finalisation');
    } finally {
      setSaving(false);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <OnboardingSettingsStep 
            data={stepData.settings}
            onUpdate={(updates) => updateStepData('settings', updates)}
          />
        );
      case 1:
        return (
          <OnboardingProfileStep 
            data={stepData.profile}
            driverProfile={driverProfile}
            userId={userId}
            onUpdate={(updates) => updateStepData('profile', updates)}
          />
        );
      case 2:
        return (
          <OnboardingDocumentsStep 
            driverId={driverId}
            userId={userId}
            onStatusChange={(status) => updateStepData('documents', { documentsStatus: status })}
          />
        );
      case 3:
        return <OnboardingCompleteStep onComplete={handleComplete} loading={saving} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <img src={logo} alt="SoloCab" className="h-10 sm:h-12 mx-auto mb-4" />
          <h1 className="text-xl sm:text-2xl font-bold">Configuration de votre espace</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Complétez ces étapes pour démarrer votre activité
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Étape {currentStep + 1} sur {STEPS.length}
            </span>
            <span className="text-sm font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          
          {/* Step Indicators */}
          <div className="flex justify-between mt-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentStep || completedSteps[step.id as keyof typeof completedSteps];
              const isCurrent = index === currentStep;
              
              return (
                <div 
                  key={step.id}
                  className={`flex flex-col items-center ${
                    index <= currentStep ? 'text-primary' : 'text-muted-foreground/50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isCompleted 
                      ? 'bg-primary text-primary-foreground' 
                      : isCurrent 
                        ? 'bg-primary/20 border-2 border-primary' 
                        : 'bg-muted'
                  }`}>
                    {isCompleted && !isCurrent ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className="text-[10px] sm:text-xs mt-1.5 font-medium">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card className="shadow-lg border-primary/10">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                {(() => {
                  const Icon = STEPS[currentStep].icon;
                  return <Icon className="w-5 h-5 text-primary" />;
                })()}
              </div>
              <div>
                <CardTitle className="text-lg">{STEPS[currentStep].title}</CardTitle>
                <CardDescription>{STEPS[currentStep].description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Navigation */}
        {currentStep < STEPS.length - 1 && (
          <div className="flex justify-between mt-6 gap-4">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0 || saving}
              className="flex-1 sm:flex-none"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Précédent
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={!canProceed() || saving}
              className="flex-1 sm:flex-none"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {currentStep === 2 ? 'Terminer' : 'Suivant'}
              {!saving && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        )}

        {/* Info */}
        {currentStep < 3 && (
          <Alert className="mt-4 bg-primary/5 border-primary/20">
            <Info className="w-4 h-4" />
            <AlertDescription className="text-sm">
              Toutes les informations sont obligatoires pour passer à l'étape suivante.
              Vous pourrez les modifier ultérieurement dans votre espace.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
