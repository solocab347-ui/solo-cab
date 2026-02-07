import { useState, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  ArrowRight, 
  ArrowLeft, 
  Rocket, 
  Target, 
  Sparkles, 
  Euro, 
  Building2, 
  Car, 
  Clock,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HorizontalSettingsFlowProps {
  data: {
    baseFare: string;
    perKmRate: string;
    hourlyRate: string;
    minimumPrice: string;
    maxPassengers: string;
    tvaIncluded: boolean;
    companyName: string;
    companyAddress: string;
    siret: string;
    siren: string;
    tvaNumber: string;
    vehicleBrand: string;
    vehicleYear: string;
    vehicleColor: string;
    vehiclePlate: string;
  };
  driverName: string;
  onUpdate: (updates: Partial<HorizontalSettingsFlowProps['data']>) => void;
  onComplete?: () => void;
}

type StepId = 'welcome' | 'base_fare' | 'per_km' | 'hourly' | 'minimum' | 'company' | 'vehicle' | 'recap';

const STEPS: StepId[] = ['welcome', 'base_fare', 'per_km', 'hourly', 'minimum', 'company', 'vehicle', 'recap'];
const SWIPE_THRESHOLD = 50;

export function HorizontalSettingsFlow({ data, driverName, onUpdate, onComplete }: HorizontalSettingsFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  
  // Prénom propre : soit le premier mot du nom complet, soit rien (pas de fallback "Chauffeur")
  const firstName = driverName?.trim()?.split(' ')[0] || '';
  const hasFirstName = firstName.length > 0;
  const step = STEPS[currentStep];

  const canProceed = (): boolean => {
    switch (step) {
      case 'welcome': return true;
      case 'base_fare': return data.baseFare !== '';
      case 'per_km': return !!data.perKmRate && parseFloat(data.perKmRate) > 0;
      case 'hourly': return true;
      case 'minimum': return !!data.minimumPrice;
      // SIRET (14 chiffres) et adresse obligatoires pour la facturation
      case 'company': 
        return !!data.companyName.trim() && 
               !!data.siret.trim() && data.siret.replace(/\s/g, '').length === 14 &&
               !!data.companyAddress.trim();
      case 'vehicle': return !!data.vehicleBrand.trim();
      case 'recap': return true;
      default: return true;
    }
  };

  const goNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentStep, onComplete]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleDragEnd = useCallback((event: any, info: PanInfo) => {
    const swipe = info.offset.x;
    const velocity = info.velocity.x;

    if (swipe > SWIPE_THRESHOLD || velocity > 500) {
      goBack();
    } else if ((swipe < -SWIPE_THRESHOLD || velocity < -500) && canProceed()) {
      goNext();
    }
  }, [goBack, goNext, canProceed]);

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  const QuickOption = ({ value, label, selected, onClick }: { value: string; label: string; selected: boolean; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-full text-sm font-medium transition-all",
        selected 
          ? "bg-primary text-primary-foreground" 
          : "bg-white/10 text-white/70 hover:bg-white/20"
      )}
    >
      {label}
    </button>
  );

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 px-2">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center">
              <Euro className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                {hasFirstName 
                  ? `Passons à tes tarifs, ${firstName} !`
                  : `Passons à tes tarifs !`
                }
              </h2>
              <p className="text-white/60 mt-2">
                On continue ensemble pour configurer ta grille tarifaire.
              </p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 max-w-sm">
              <p className="text-white/80 text-sm">
                <strong className="text-primary">2 minutes</strong> pour définir tes prix. 
                Swipe vers la gauche pour commencer →
              </p>
            </div>
            <div className="flex items-center gap-2 text-white/40 text-xs">
              <Clock className="w-4 h-4" />
              <span>≈ 2 minutes</span>
            </div>
          </div>
        );

      case 'base_fare':
        return (
          <div className="h-full flex flex-col justify-center space-y-6 px-2">
            <div className="text-center">
              <Euro className="w-10 h-10 text-primary mx-auto mb-3" />
              <h2 className="text-xl font-bold text-white">Prise en charge</h2>
              <p className="text-white/60 text-sm mt-1">
                Montant fixe au départ de chaque course
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <Input
                  type="number"
                  value={data.baseFare}
                  onChange={(e) => onUpdate({ baseFare: e.target.value })}
                  placeholder="0"
                  className="h-16 text-3xl text-center bg-white/10 border-white/20 text-white font-bold"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 text-xl">€</span>
              </div>
              
              <div className="flex flex-wrap justify-center gap-2">
                {['0', '3', '5', '8', '10'].map(v => (
                  <QuickOption 
                    key={v} 
                    value={v} 
                    label={v === '0' ? '0€' : `${v}€`} 
                    selected={data.baseFare === v}
                    onClick={() => onUpdate({ baseFare: v })}
                  />
                ))}
              </div>
              
              <p className="text-center text-white/40 text-xs">
                💡 0€ pour être compétitif, 5-10€ en moyenne
              </p>
            </div>
          </div>
        );

      case 'per_km':
        const exampleFare = data.baseFare && data.perKmRate 
          ? (parseFloat(data.baseFare) + 15 * parseFloat(data.perKmRate)).toFixed(2)
          : null;
        return (
          <div className="h-full flex flex-col justify-center space-y-6 px-2">
            <div className="text-center">
              <Target className="w-10 h-10 text-primary mx-auto mb-3" />
              <h2 className="text-xl font-bold text-white">Prix au kilomètre</h2>
              <p className="text-white/60 text-sm mt-1">
                Le cœur de ta rentabilité
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  value={data.perKmRate}
                  onChange={(e) => onUpdate({ perKmRate: e.target.value })}
                  placeholder="1.80"
                  className="h-16 text-3xl text-center bg-white/10 border-white/20 text-white font-bold"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 text-lg">€/km</span>
              </div>
              
              <div className="flex flex-wrap justify-center gap-2">
                {['1.50', '1.80', '2.00', '2.50', '3.00'].map(v => (
                  <QuickOption 
                    key={v} 
                    value={v} 
                    label={`${v}€`} 
                    selected={data.perKmRate === v}
                    onClick={() => onUpdate({ perKmRate: v })}
                  />
                ))}
              </div>
              
              {exampleFare && (
                <div className="bg-emerald-500/20 rounded-xl p-3 text-center">
                  <p className="text-emerald-400 text-sm">Course 15km = <strong className="text-lg">{exampleFare}€</strong></p>
                </div>
              )}
            </div>
          </div>
        );

      case 'hourly':
        return (
          <div className="h-full flex flex-col justify-center space-y-6 px-2">
            <div className="text-center">
              <Clock className="w-10 h-10 text-primary mx-auto mb-3" />
              <h2 className="text-xl font-bold text-white">Tarif horaire</h2>
              <p className="text-white/60 text-sm mt-1">
                Pour les mises à disposition (optionnel)
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <Input
                  type="number"
                  value={data.hourlyRate}
                  onChange={(e) => onUpdate({ hourlyRate: e.target.value })}
                  placeholder="45"
                  className="h-16 text-3xl text-center bg-white/10 border-white/20 text-white font-bold"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 text-lg">€/h</span>
              </div>
              
              <div className="flex flex-wrap justify-center gap-2">
                {['', '45', '55', '65', '80'].map(v => (
                  <QuickOption 
                    key={v || 'none'} 
                    value={v} 
                    label={v ? `${v}€/h` : 'Aucun'} 
                    selected={data.hourlyRate === v}
                    onClick={() => onUpdate({ hourlyRate: v })}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 'minimum':
        return (
          <div className="h-full flex flex-col justify-center space-y-6 px-2">
            <div className="text-center">
              <Sparkles className="w-10 h-10 text-primary mx-auto mb-3" />
              <h2 className="text-xl font-bold text-white">Minimum de course</h2>
              <p className="text-white/60 text-sm mt-1">
                Protège-toi des micro-trajets
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <Input
                  type="number"
                  value={data.minimumPrice}
                  onChange={(e) => onUpdate({ minimumPrice: e.target.value })}
                  placeholder="15"
                  className="h-16 text-3xl text-center bg-white/10 border-white/20 text-white font-bold"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 text-xl">€</span>
              </div>
              
              <div className="flex flex-wrap justify-center gap-2">
                {['10', '12', '15', '18', '20', '25'].map(v => (
                  <QuickOption 
                    key={v} 
                    value={v} 
                    label={`${v}€`} 
                    selected={data.minimumPrice === v}
                    onClick={() => onUpdate({ minimumPrice: v })}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 'company':
        const siretClean = data.siret.replace(/\s/g, '');
        const siretValid = siretClean.length === 14 && /^\d+$/.test(siretClean);
        return (
          <div className="h-full flex flex-col justify-center space-y-4 px-2 overflow-y-auto py-4">
            <div className="text-center">
              <Building2 className="w-10 h-10 text-primary mx-auto mb-2" />
              <h2 className="text-xl font-bold text-white">Ton entreprise</h2>
              <p className="text-white/60 text-sm mt-1">
                Informations légales pour tes factures
              </p>
            </div>

            {/* Explication légale */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <p className="text-amber-200 text-xs leading-relaxed">
                <strong>📋 Obligation légale :</strong> En tant que professionnel VTC, 
                tu dois mentionner ton SIRET et ton adresse sur toutes tes factures. 
                Ces informations sont requises par la loi.
              </p>
            </div>
            
            <div className="space-y-3">
              <div>
                <Label className="text-white/60 text-sm">Nom commercial *</Label>
                <Input
                  value={data.companyName}
                  onChange={(e) => onUpdate({ companyName: e.target.value })}
                  placeholder="Ex: VTC Premium Services"
                  className="h-12 bg-white/10 border-white/20 text-white mt-1"
                />
              </div>
              
              <div>
                <Label className="text-white/60 text-sm">SIRET * <span className="text-white/40">(14 chiffres)</span></Label>
                <Input
                  value={data.siret}
                  onChange={(e) => {
                    // Nettoyer et formater le SIRET (seulement chiffres)
                    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 14);
                    onUpdate({ siret: cleaned });
                  }}
                  placeholder="12345678901234"
                  maxLength={14}
                  className={`h-12 bg-white/10 border-white/20 text-white mt-1 font-mono ${
                    data.siret && !siretValid ? 'border-red-500/50' : ''
                  }`}
                />
                {data.siret && !siretValid && (
                  <p className="text-red-400 text-xs mt-1">Le SIRET doit contenir exactement 14 chiffres</p>
                )}
              </div>

              <div>
                <Label className="text-white/60 text-sm">Adresse de facturation *</Label>
                <Input
                  value={data.companyAddress}
                  onChange={(e) => onUpdate({ companyAddress: e.target.value })}
                  placeholder="123 Rue de Paris, 75001 Paris"
                  className="h-12 bg-white/10 border-white/20 text-white mt-1"
                />
                <p className="text-white/40 text-xs mt-1">Adresse complète avec code postal et ville</p>
              </div>
              
              <div>
                <Label className="text-white/60 text-sm">N° TVA intracommunautaire <span className="text-white/40">(optionnel)</span></Label>
                <Input
                  value={data.tvaNumber}
                  onChange={(e) => onUpdate({ tvaNumber: e.target.value })}
                  placeholder="FR12345678901"
                  className="h-10 bg-white/10 border-white/20 text-white mt-1"
                />
              </div>
            </div>
          </div>
        );

      case 'vehicle':
        return (
          <div className="h-full flex flex-col justify-center space-y-6 px-2">
            <div className="text-center">
              <Car className="w-10 h-10 text-primary mx-auto mb-3" />
              <h2 className="text-xl font-bold text-white">Ton véhicule</h2>
              <p className="text-white/60 text-sm mt-1">
                Aide tes clients à te reconnaître
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label className="text-white/60 text-sm">Marque *</Label>
                <Input
                  value={data.vehicleBrand}
                  onChange={(e) => onUpdate({ vehicleBrand: e.target.value })}
                  placeholder="Ex: Mercedes, Tesla..."
                  className="h-12 bg-white/10 border-white/20 text-white mt-1"
                />
              </div>
              
              <div className="flex flex-wrap justify-center gap-2">
                {['Mercedes', 'Tesla', 'BMW', 'Audi', 'Peugeot'].map(v => (
                  <QuickOption 
                    key={v} 
                    value={v} 
                    label={v} 
                    selected={data.vehicleBrand === v}
                    onClick={() => onUpdate({ vehicleBrand: v })}
                  />
                ))}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/60 text-sm">Couleur</Label>
                  <Input
                    value={data.vehicleColor}
                    onChange={(e) => onUpdate({ vehicleColor: e.target.value })}
                    placeholder="Noir"
                    className="h-10 bg-white/10 border-white/20 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-white/60 text-sm">Plaque</Label>
                  <Input
                    value={data.vehiclePlate}
                    onChange={(e) => onUpdate({ vehiclePlate: e.target.value })}
                    placeholder="AB-123-CD"
                    className="h-10 bg-white/10 border-white/20 text-white mt-1"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'recap':
        return (
          <div className="h-full flex flex-col justify-center space-y-6 px-2">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Parfait {firstName} !</h2>
              <p className="text-white/60 text-sm mt-1">
                Tes tarifs sont configurés
              </p>
            </div>
            
            <div className="bg-white/5 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Prise en charge</span>
                <span className="text-white font-medium">{data.baseFare || '0'}€</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Prix au km</span>
                <span className="text-white font-medium">{data.perKmRate}€/km</span>
              </div>
              {data.hourlyRate && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Tarif horaire</span>
                  <span className="text-white font-medium">{data.hourlyRate}€/h</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Minimum</span>
                <span className="text-white font-medium">{data.minimumPrice}€</span>
              </div>
              <div className="border-t border-white/10 pt-3 flex justify-between text-sm">
                <span className="text-white/60">Entreprise</span>
                <span className="text-white font-medium">{data.companyName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Véhicule</span>
                <span className="text-white font-medium">{data.vehicleBrand} {data.vehicleColor}</span>
              </div>
            </div>
            
            <Button
              onClick={onComplete}
              className="w-full h-14 bg-gradient-to-r from-primary to-emerald-500 text-lg font-semibold"
            >
              Continuer
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Mini progress */}
      <div className="flex-shrink-0 flex justify-center gap-1.5 py-2">
        {STEPS.map((_, i) => (
          <div 
            key={i}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              i === currentStep ? "bg-primary w-6" : i < currentStep ? "bg-emerald-500" : "bg-white/20"
            )}
          />
        ))}
      </div>

      {/* Swipeable content */}
      <motion.div 
        className="flex-1 overflow-hidden relative"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
      >
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'tween', duration: 0.25 }}
            className="absolute inset-0 overflow-hidden"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {/* Swipe hints */}
        {currentStep > 0 && (
          <div className="absolute left-1 top-1/2 -translate-y-1/2 text-white/10">
            <ChevronLeft className="w-6 h-6" />
          </div>
        )}
        {currentStep < STEPS.length - 1 && canProceed() && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 text-white/10">
            <ChevronRight className="w-6 h-6" />
          </div>
        )}
      </motion.div>

      {/* Navigation buttons */}
      {step !== 'recap' && (
        <div className="flex-shrink-0 flex gap-3 px-2 py-3">
          <Button
            variant="ghost"
            onClick={goBack}
            disabled={currentStep === 0}
            className="flex-1 h-11 text-white/60 hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour
          </Button>
          <Button
            onClick={goNext}
            disabled={!canProceed()}
            className="flex-1 h-11 bg-primary"
          >
            Suivant
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
