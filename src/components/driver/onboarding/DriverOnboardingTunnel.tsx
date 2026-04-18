import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowRight, 
  ArrowLeft,
  Settings,
  User,
  FileText,
  Sparkles,
  CheckCircle2,
  Loader2,
  CreditCard,
  Save,
  Wallet,
  Target,
  Play
} from 'lucide-react';
import { OnboardingSettingsStep } from './OnboardingSettingsStep';
import { CarouselSettingsFlow } from './CarouselSettingsFlow';
import { OnboardingProfileStep } from './OnboardingProfileStep';
import { OnboardingDocumentsStep } from './OnboardingDocumentsStep';
import { OnboardingBillingStep } from './OnboardingBillingStep';
import { OnboardingNfcStep } from './OnboardingNfcStep';
import { OnboardingObjectivesStep } from './OnboardingObjectivesStep';
import { OnboardingTrialStartStep } from './OnboardingTrialStartStep';
import { OnboardingAIAssistant } from './OnboardingAIAssistant';
import { useOnboardingAutoSave } from './hooks/useOnboardingAutoSave';
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

// Ordre psychologique : Projection → Construction → Lancement
const ALL_STEPS = [
  { id: 'objectives', title: 'Ta Vision', icon: Target },      // 1. PROJECTION - Engager émotionnellement
  { id: 'settings', title: 'Tes Tarifs', icon: Settings },     // 2. CONSTRUCTION - Configurer le business
  { id: 'profile', title: 'Ton Profil', icon: User },          // 3. CONSTRUCTION - Image publique
  { id: 'documents', title: 'Documents', icon: FileText },     // 4. VALIDATION - Conformité
  { id: 'nfc', title: 'Plaque NFC', icon: CreditCard },        // 5. ÉQUIPEMENT - Outil marketing
  { id: 'billing', title: 'Facturation', icon: Wallet },       // 6. ÉQUIPEMENT - Choix mode paiement (peut bloquer)
  { id: 'trial_start', title: 'Lancer', icon: Play },          // 7. LANCEMENT - Démarrer l'essai
];

export function DriverOnboardingTunnel({ 
  driverId, 
  userId, 
  driverProfile,
  onComplete,
  initialStep = 0
}: OnboardingTunnelProps) {
  // Vérifie si le chauffeur a déjà une plaque OU si une commande est en cours
  const hasNfcPlate = !!(driverProfile?.driver?.has_nfc_plate || driverProfile?.driver?.nfc_tag_number || driverProfile?.driver?.nfc_plate_order_id);
  
  // Filtrer les étapes - masquer l'étape NFC si le chauffeur a déjà une plaque
  const STEPS = hasNfcPlate 
    ? ALL_STEPS.filter(step => step.id !== 'nfc')
    : ALL_STEPS;

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
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
      vehicleModel: driverProfile?.driver?.vehicle_model || '',
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
    },
    documents: {
      documentsStatus: driverProfile?.driver?.documents_status || 'pending',
    },
    billing: {
      billingType: (driverProfile?.driver?.billing_type as 'own_equipment' | 'buy_equipment' | 'solocab_stripe') || 'own_equipment',
    },
    nfc: {
      hasNfcPlate,
      wantsNfcPlate: false,
    }
  });

  // Vérifier les étapes déjà complétées
  const [completedSteps, setCompletedSteps] = useState({
    settings: driverProfile?.driver?.onboarding_settings_completed || false,
    profile: driverProfile?.driver?.onboarding_profile_completed || false,
    billing: true, // Toujours "complétable" - un choix par défaut existe
    documents: driverProfile?.driver?.onboarding_documents_completed || false,
    nfc: true, // Toujours "complétable" car optionnel
  });

  // Auto-save hook
  const { autoSave, saveImmediately } = useOnboardingAutoSave(driverId, userId, currentStep);

  // Scroll to top when step changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  // Auto-save on data changes (for settings and profile steps)
  useEffect(() => {
    const stepId = currentStep === 0 ? 'settings' : currentStep === 1 ? 'profile' : null;
    if (stepId) {
      setAutoSaveStatus('saving');
      autoSave(stepData, stepId);
      
      // Show "saved" status after debounce delay
      const timeout = setTimeout(() => {
        setAutoSaveStatus('saved');
        // Reset to idle after showing "saved"
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      }, 2500);
      
      return () => clearTimeout(timeout);
    }
  }, [stepData, currentStep, autoSave]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const stepId = currentStep === 0 ? 'settings' : currentStep === 1 ? 'profile' : null;
      if (stepId) {
        saveImmediately(stepData, stepId);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [stepData, currentStep, saveImmediately]);

  // Validation de chaque étape - SIMPLIFIÉE pour réduire les abandons
  const isSettingsValid = () => {
    const { baseFare, perKmRate, companyName, vehicleBrand } = stepData.settings;
    // Seuls les champs essentiels sont requis - le reste peut être complété plus tard
    return !!(baseFare && perKmRate && companyName && vehicleBrand);
  };

  const isProfileValid = () => {
    const { profilePhotoUrl, serviceDescription, workingSectors, servicesOffered } = stepData.profile;
    return !!(profilePhotoUrl && serviceDescription && workingSectors.length > 0 && servicesOffered.length > 0);
  };

  const isDocumentsValid = () => {
    return stepData.documents.documentsStatus === 'submitted' || stepData.documents.documentsStatus === 'validated';
  };

  const canProceed = () => {
    const currentStepId = STEPS[currentStep]?.id;
    switch (currentStepId) {
      case 'settings': return isSettingsValid();
      case 'profile': return isProfileValid();
      case 'billing': return true; // Billing a toujours un choix par défaut
      case 'documents': return isDocumentsValid();
      case 'nfc': return true; // NFC est optionnel
      case 'objectives': return false; // Géré par son propre bouton
      case 'trial_start': return false; // Géré par son propre bouton
      default: return false;
    }
  };

  // Les étapes qui gèrent leur propre navigation
  const isSelfNavigatedStep = () => {
    const currentStepId = STEPS[currentStep]?.id;
    return currentStepId === 'objectives' || currentStepId === 'trial_start';
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
      
      // Créer/mettre à jour le véhicule dans driver_vehicles si marque renseignée
      if (settings.vehicleBrand) {
        // Vérifier si un véhicule existe déjà pour ce chauffeur
        const { data: existingVehicles } = await supabase
          .from('driver_vehicles')
          .select('id')
          .eq('driver_id', driverId)
          .eq('is_active', true)
          .limit(1);

        const vehicleData = {
          driver_id: driverId,
          brand: settings.vehicleBrand,
          model: settings.vehicleBrand, // Utilise la marque comme modèle par défaut
          color: settings.vehicleColor || null,
          plate: settings.vehiclePlate || null,
          year: settings.vehicleYear ? parseInt(settings.vehicleYear) : null,
          category: 'berline', // Catégorie par défaut
          max_passengers: settings.maxPassengers ? parseInt(settings.maxPassengers) : 4,
          is_favorite: true,
          is_active: true,
        };

        if (existingVehicles && existingVehicles.length > 0) {
          // Mettre à jour le véhicule existant
          await supabase
            .from('driver_vehicles')
            .update(vehicleData)
            .eq('id', existingVehicles[0].id);
        } else {
          // Créer un nouveau véhicule
          await supabase
            .from('driver_vehicles')
            .insert(vehicleData);
        }
      }
      
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
          public_profile_enabled: true,
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

  const saveBilling = async () => {
    setSaving(true);
    try {
      const { billing } = stepData;
      
      // Map billing type correctly
      const dbBillingType = billing.billingType === 'buy_equipment' ? 'own_equipment' : billing.billingType;
      
      const { error } = await supabase
        .from('drivers')
        .update({
          billing_type: dbBillingType,
          wants_tpe_affiliate: billing.billingType === 'buy_equipment',
          onboarding_step: 'documents',
        })
        .eq('id', driverId);

      if (error) throw error;
      
      setCompletedSteps(prev => ({ ...prev, billing: true }));
      toast.success('Préférences de facturation enregistrées !');
      return true;
    } catch (error: any) {
      console.error('Error saving billing:', error);
      toast.error('Erreur lors de l\'enregistrement');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const currentStepId = STEPS[currentStep]?.id;
    let success = false;
    
    switch (currentStepId) {
      case 'settings':
        success = await saveSettings();
        break;
      case 'profile':
        success = await saveProfile();
        break;
      case 'billing':
        success = await saveBilling();
        break;
      case 'documents':
        // Documents are saved automatically via DriverDocuments component
        success = true;
        break;
      case 'nfc':
        // NFC step - just proceed
        success = true;
        break;
      default:
        success = true;
    }

    if (success && currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
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

      if (error) {
        if (error.message?.includes('Stripe Connect')) {
          toast.error('Vous devez d\'abord activer votre compte Stripe Connect pour recevoir vos paiements.', {
            duration: 6000,
            action: {
              label: 'Activer maintenant',
              onClick: () => window.location.href = '/driver-welcome?step=stripe',
            },
          });
          return;
        }
        throw error;
      }
      
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
    const currentStepId = STEPS[currentStep]?.id;
    
    switch (currentStepId) {
      case 'settings':
        return (
          <CarouselSettingsFlow 
            data={stepData.settings}
            driverName={driverProfile?.full_name || 'Chauffeur'}
            onUpdate={(updates) => updateStepData('settings', updates)}
            onComplete={handleNext}
          />
        );
      case 'profile':
        return (
          <OnboardingProfileStep 
            data={stepData.profile}
            driverProfile={driverProfile}
            userId={userId}
            onUpdate={(updates) => updateStepData('profile', updates)}
          />
        );
      case 'billing':
        return (
          <OnboardingBillingStep
            data={stepData.billing}
            onUpdate={(updates) => updateStepData('billing', updates)}
          />
        );
      case 'documents':
        return (
          <OnboardingDocumentsStep 
            driverId={driverId}
            userId={userId}
            onStatusChange={(status) => updateStepData('documents', { documentsStatus: status })}
          />
        );
      case 'nfc':
        return (
          <OnboardingNfcStep
            hasNfcPlate={stepData.nfc.hasNfcPlate}
            driverId={driverId}
          />
        );
      case 'objectives':
        return (
          <OnboardingObjectivesStep
            driverId={driverId}
            onComplete={() => {
              setCurrentStep(currentStep + 1);
            }}
          />
        );
      case 'trial_start':
        return (
          <OnboardingTrialStartStep
            driverId={driverId}
            billingType={stepData.billing.billingType}
            stripeAccountStatus={driverProfile?.driver?.stripe_account_status}
            documentsStatus={stepData.documents.documentsStatus}
            onComplete={handleComplete}
            loading={saving}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className="min-h-screen min-h-[100dvh] flex flex-col bg-gradient-to-b from-background to-muted/30"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        touchAction: 'pan-y',
      }}
    >
      {/* Fixed Header */}
      <div 
        className="flex-shrink-0 px-4 pt-4 pb-2"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <div className="max-w-lg mx-auto">
          {/* Logo */}
          <div className="text-center mb-3">
            <img src={logo} alt="SoloCab" className="h-8 mx-auto" />
          </div>
          
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-lg font-bold text-center">Configuration de votre espace</h1>
            {/* Auto-save indicator */}
            {autoSaveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
              </span>
            )}
            {autoSaveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-[10px] text-primary">
                <Save className="w-3 h-3" />
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-xs text-center mt-0.5">
            Vos données sont sauvegardées automatiquement
          </p>

          {/* Progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Étape {currentStep + 1} sur {STEPS.length}
              </span>
              <span className="text-xs font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
            
            {/* Step Indicators - Compact */}
            <div className="flex justify-between mt-3 px-1">
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
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isCompleted 
                        ? 'bg-primary text-primary-foreground' 
                        : isCurrent 
                          ? 'bg-primary/20 border-2 border-primary' 
                          : 'bg-muted'
                    }`}>
                      {isCompleted && !isCurrent ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <span className="text-[9px] mt-1 font-medium">{step.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content - FIXED for iOS/Android */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-4"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
          paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="max-w-lg mx-auto pb-4 h-full flex flex-col">
          {/* Step Header Card - Hide for conversational settings */}
          {STEPS[currentStep].id !== 'settings' && (
            <div className="bg-card border rounded-lg p-3 mb-3 mt-3 shadow-sm shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  {(() => {
                    const Icon = STEPS[currentStep].icon;
                    return <Icon className="w-4 h-4 text-primary" />;
                  })()}
                </div>
                <div>
                  <h2 className="text-base font-semibold">{STEPS[currentStep].title}</h2>
                </div>
              </div>
            </div>
          )}

          {/* AI Assistant - Hide for conversational settings (it's built-in) */}
          {STEPS[currentStep].id !== 'settings' && (
            <OnboardingAIAssistant
              currentStep={currentStep}
              stepData={stepData}
              driverName={driverProfile?.full_name || 'Chauffeur'}
            />
          )}

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className={STEPS[currentStep].id === 'settings' ? 'flex-1 flex flex-col min-h-0 mt-3' : ''}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Fixed Footer Navigation - Masqué pour les étapes auto-gérées */}
      {!isSelfNavigatedStep() && currentStep < STEPS.length - 1 && (
        <div 
          className="flex-shrink-0 border-t bg-background/95 backdrop-blur px-4 py-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="max-w-lg mx-auto flex gap-3">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0 || saving}
              className="flex-1 h-11"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Précédent
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={!canProceed() || saving}
              className="flex-1 h-11"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : null}
              Suivant
              {!saving && <ArrowRight className="w-4 h-4 ml-1.5" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
