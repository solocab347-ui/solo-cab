import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Rocket, Target, Sparkles, Euro, Building2, Car, Clock } from 'lucide-react';
import {
  CarouselStep,
  CarouselNav,
  CoachSpeech,
  InputCard,
  QuickSelect,
  TipBox,
  ToggleCard
} from './carousel';
import { cn } from '@/lib/utils';

interface CarouselSettingsFlowProps {
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
  onUpdate: (updates: Partial<CarouselSettingsFlowProps['data']>) => void;
  onComplete?: () => void;
}

// Étapes dans l'ordre psychologique optimal
type StepId = 
  | 'welcome'
  | 'vision'
  | 'base_fare'
  | 'per_km'
  | 'hourly'
  | 'minimum'
  | 'tva'
  | 'company_name'
  | 'company_details'
  | 'vehicle_brand'
  | 'vehicle_details'
  | 'recap';

const STEPS: StepId[] = [
  'welcome',
  'vision',
  'base_fare',
  'per_km',
  'hourly',
  'minimum',
  'tva',
  'company_name',
  'company_details',
  'vehicle_brand',
  'vehicle_details',
  'recap'
];

export function CarouselSettingsFlow({
  data,
  driverName,
  onUpdate,
  onComplete
}: CarouselSettingsFlowProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  const firstName = driverName?.split(' ')[0] || 'Chauffeur';
  const currentStep = STEPS[currentStepIndex];
  const totalSteps = STEPS.length;

  const goNext = useCallback(() => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentStepIndex, onComplete]);

  const goBack = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  // Validation pour chaque étape
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'welcome':
      case 'vision':
        return true;
      case 'base_fare':
        return data.baseFare !== '';
      case 'per_km':
        return !!data.perKmRate && parseFloat(data.perKmRate) > 0;
      case 'hourly':
        return true; // Optionnel
      case 'minimum':
        return !!data.minimumPrice;
      case 'tva':
        return true;
      case 'company_name':
        return true; // Optionnel à l'onboarding, complétable plus tard
      case 'company_details':
        return true; // Optionnel
      case 'vehicle_brand':
        return !!data.vehicleBrand.trim() && data.vehicleBrand !== 'À compléter';
      case 'vehicle_details':
        return true; // Optionnel
      case 'recap':
        return true;
      default:
        return true;
    }
  };

  // Calculs en temps réel
  const getExampleFare = () => {
    if (data.baseFare !== '' && data.perKmRate) {
      const base = parseFloat(data.baseFare) || 0;
      const km = parseFloat(data.perKmRate) || 0;
      return (base + 15 * km).toFixed(2);
    }
    return null;
  };

  const getSuggestedMinimum = () => {
    if (data.baseFare !== '' && data.perKmRate) {
      const base = parseFloat(data.baseFare) || 0;
      const km = parseFloat(data.perKmRate) || 0;
      const min = base + 3 * km;
      const max = base + 5 * km;
      return `${min.toFixed(0)}€ - ${max.toFixed(0)}€`;
    }
    return '15€ - 25€';
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <CarouselStep>
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
              <CoachSpeech
                title={`Salut ${firstName} !`}
                message="Je suis Alex, ton coach SoloCab. Ensemble, on va construire"
                highlight="les fondations de ton indépendance."
              />
              
              {/* Time estimation */}
              <div className="bg-accent/10 border border-accent/30 rounded-2xl p-4 text-center max-w-sm">
                <div className="flex items-center justify-center gap-2 text-accent mb-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-semibold">≈ 5-8 minutes</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Prends un moment calme pour remplir ce parcours. C'est le temps qu'il te faut pour poser 
                  <span className="text-foreground font-medium"> les bases de ta réussite</span>.
                </p>
              </div>
              
              <div className="space-y-3 w-full max-w-sm">
                {[
                  { icon: <Target className="w-5 h-5" />, text: "Une question à la fois, sans pression" },
                  { icon: <Sparkles className="w-5 h-5" />, text: "Tout est sauvegardé automatiquement" },
                  { icon: <Rocket className="w-5 h-5" />, text: "Tu gardes le contrôle total de tes tarifs" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-card/50 backdrop-blur-sm rounded-xl p-3 border border-border/50"
                  >
                    <div className="text-primary">{item.icon}</div>
                    <span className="text-sm text-muted-foreground">{item.text}</span>
                  </div>
                ))}
              </div>

              <TipBox type="tip" delay={3} className="max-w-sm">
                🔥 Tu es au bon endroit, au bon moment. Allons-y ensemble !
              </TipBox>
            </div>
          </CarouselStep>
        );

      case 'vision':
        return (
          <CarouselStep>
            <div className="flex-1 flex flex-col items-center justify-center space-y-8">
              <CoachSpeech
                title="Ton objectif avec SoloCab ?"
                message="Ici, pas de frais de transaction prélevée sur tes courses. TU fixes tes prix, TU gères tes clients."
                highlight="C'est ça l'indépendance."
              />
              
              <TipBox type="highlight" delay={3}>
                <p>
                  SoloCab ne te trouve pas de clients. On te donne les <strong>outils</strong> pour 
                  construire <strong>ta propre clientèle</strong> et te libérer des plateformes.
                </p>
              </TipBox>
            </div>
          </CarouselStep>
        );

      case 'base_fare':
        return (
          <CarouselStep>
            <div className="space-y-6">
              <CoachSpeech
                title="Ta prise en charge"
                message="C'est le montant fixe que le client paie dès qu'il monte. Sur les apps, c'est elles qui décident. Ici,"
                highlight="c'est TOI le patron."
              />

              <InputCard
                label="Prise en charge"
                hint="Montant de départ (peut être 0€)"
                value={data.baseFare}
                onChange={(v) => onUpdate({ baseFare: v })}
                placeholder="0"
                type="number"
                suffix="€"
                delay={3}
              />

              <QuickSelect
                options={[
                  { label: '0€ (pas de frais)', value: '0' },
                  { label: '3€', value: '3' },
                  { label: '5€', value: '5' },
                  { label: '8€', value: '8' },
                  { label: '10€', value: '10' },
                ]}
                value={data.baseFare}
                onChange={(v) => onUpdate({ baseFare: v })}
                delay={4}
              />

              <TipBox type="tip" delay={5}>
                💡 Entre 5€ et 10€ est courant. Mets 0€ si tu veux rester compétitif avec les apps.
              </TipBox>
            </div>
          </CarouselStep>
        );

      case 'per_km':
        const exampleFare = getExampleFare();
        return (
          <CarouselStep>
            <div className="space-y-6">
              <CoachSpeech
                title="Ton tarif au kilomètre"
                message="C'est le cœur de ta rentabilité ! En moyenne les VTC facturent entre 1,50€ et 2,50€/km."
                highlight="Les véhicules premium vont jusqu'à 3€/km."
              />

              <InputCard
                label="Prix par kilomètre"
                value={data.perKmRate}
                onChange={(v) => onUpdate({ perKmRate: v })}
                placeholder="1.80"
                type="number"
                suffix="€/km"
                delay={3}
              />

              <QuickSelect
                options={[
                  { label: '1,50€', value: '1.50' },
                  { label: '1,80€', value: '1.80' },
                  { label: '2,00€', value: '2.00' },
                  { label: '2,50€', value: '2.50' },
                  { label: '3,00€', value: '3.00' },
                ]}
                value={data.perKmRate}
                onChange={(v) => onUpdate({ perKmRate: v })}
                delay={4}
              />

              {exampleFare && (
                <TipBox type="calculation" title="Exemple : course de 15km" delay={5}>
                  <p className="text-2xl font-bold">{exampleFare}€</p>
                </TipBox>
              )}
            </div>
          </CarouselStep>
        );

      case 'hourly':
        return (
          <CarouselStep>
            <div className="space-y-6">
              <CoachSpeech
                title="As-tu un tarif horaire ?"
                message="Idéal pour les mises à disposition : mariages, événements, journées business..."
                highlight="C'est un bonus rentable !"
              />

              <InputCard
                label="Tarif horaire (optionnel)"
                hint="Laisse vide si tu n'en veux pas"
                value={data.hourlyRate}
                onChange={(v) => onUpdate({ hourlyRate: v })}
                placeholder="45"
                type="number"
                suffix="€/h"
                delay={3}
              />

              <QuickSelect
                options={[
                  { label: 'Pas de tarif', value: '' },
                  { label: '45€/h', value: '45' },
                  { label: '55€/h', value: '55' },
                  { label: '65€/h', value: '65' },
                  { label: '80€/h', value: '80' },
                ]}
                value={data.hourlyRate}
                onChange={(v) => onUpdate({ hourlyRate: v })}
                delay={4}
              />

              <TipBox type="tip" delay={5}>
                Les entreprises adorent réserver à l'heure. Entre 45€ et 80€/h selon ton standing.
              </TipBox>
            </div>
          </CarouselStep>
        );

      case 'minimum':
        return (
          <CarouselStep>
            <div className="space-y-6">
              <CoachSpeech
                title="Ton minimum de course"
                message="C'est le tarif plancher garanti, même pour une course très courte."
                highlight="Protège-toi des micro-trajets !"
              />

              <InputCard
                label="Minimum garanti"
                value={data.minimumPrice}
                onChange={(v) => onUpdate({ minimumPrice: v })}
                placeholder="15"
                type="number"
                suffix="€"
                delay={3}
              />

              <QuickSelect
                options={[
                  { label: '10€', value: '10' },
                  { label: '12€', value: '12' },
                  { label: '15€', value: '15' },
                  { label: '18€', value: '18' },
                  { label: '20€', value: '20' },
                  { label: '25€', value: '25' },
                ]}
                value={data.minimumPrice}
                onChange={(v) => onUpdate({ minimumPrice: v })}
                delay={4}
              />

              <TipBox type="calculation" title="Suggestion basée sur tes tarifs" delay={5}>
                <p className="text-lg font-semibold">{getSuggestedMinimum()}</p>
              </TipBox>
            </div>
          </CarouselStep>
        );

      case 'tva':
        return (
          <CarouselStep>
            <div className="space-y-6">
              <CoachSpeech
                title="Tes prix incluent la TVA ?"
                message="La plupart des VTC affichent des prix TTC pour simplifier."
                highlight="Si tu es en micro, ça n'a pas d'impact."
              />

              <ToggleCard
                title="Prix TTC (TVA incluse)"
                description="Recommandé pour la transparence avec tes clients"
                checked={data.tvaIncluded}
                onChange={(v) => onUpdate({ tvaIncluded: v })}
                delay={3}
              />

              <TipBox type="tip" delay={4}>
                Si tu es au régime de TVA, afficher TTC évite les confusions. En micro-entreprise sans TVA, cette option n'a pas d'impact réel.
              </TipBox>
            </div>
          </CarouselStep>
        );

      case 'company_name':
        return (
          <CarouselStep>
            <div className="space-y-6">
              <CoachSpeech
                title="Ton entreprise s'appelle ?"
                message="C'est le nom qui apparaîtra sur ton profil public et tes factures."
                highlight="Ta marque, ton identité !"
              />

              <InputCard
                label="Nom commercial"
                value={data.companyName}
                onChange={(v) => onUpdate({ companyName: v })}
                placeholder="Ex: VTC Premium Services"
                delay={3}
              />

              <TipBox type="tip" delay={4}>
                Ça peut être ton nom personnel ou un nom de société. Choisis quelque chose de pro et mémorable !
              </TipBox>
            </div>
          </CarouselStep>
        );

      case 'company_details':
        return (
          <CarouselStep>
            <div className="space-y-6">
              <CoachSpeech
                title="Infos légales (optionnel)"
                message="SIRET, adresse... Tu peux les ajouter maintenant ou plus tard dans les réglages."
              />

              <div className="space-y-4">
                <InputCard
                  label="SIRET"
                  hint="14 chiffres (optionnel)"
                  value={data.siret}
                  onChange={(v) => onUpdate({ siret: v })}
                  placeholder="12345678901234"
                  delay={3}
                />

                <InputCard
                  label="Adresse professionnelle"
                  hint="Optionnel"
                  value={data.companyAddress}
                  onChange={(v) => onUpdate({ companyAddress: v })}
                  placeholder="123 rue Example, 75001 Paris"
                  delay={4}
                />
              </div>
            </div>
          </CarouselStep>
        );

      case 'vehicle_brand':
        return (
          <CarouselStep>
            <div className="space-y-6">
              <CoachSpeech
                title="Ton véhicule ?"
                message="Dis-moi la marque de ta voiture. Ça aidera tes clients à te reconnaître !"
              />

              <InputCard
                label="Marque du véhicule"
                value={data.vehicleBrand}
                onChange={(v) => onUpdate({ vehicleBrand: v })}
                placeholder="Ex: Mercedes, Tesla, BMW..."
                delay={3}
              />

              <QuickSelect
                options={[
                  { label: 'Mercedes', value: 'Mercedes' },
                  { label: 'Tesla', value: 'Tesla' },
                  { label: 'BMW', value: 'BMW' },
                  { label: 'Audi', value: 'Audi' },
                  { label: 'Peugeot', value: 'Peugeot' },
                ]}
                value={data.vehicleBrand}
                onChange={(v) => onUpdate({ vehicleBrand: v })}
                delay={4}
              />
            </div>
          </CarouselStep>
        );

      case 'vehicle_details':
        return (
          <CarouselStep>
            <div className="space-y-6">
              <CoachSpeech
                title="Détails du véhicule (optionnel)"
                message="Plus d'infos pour tes clients : couleur, année, immatriculation..."
              />

              <div className="space-y-4">
                <InputCard
                  label="Couleur"
                  value={data.vehicleColor}
                  onChange={(v) => onUpdate({ vehicleColor: v })}
                  placeholder="Ex: Noir, Blanc..."
                  delay={3}
                />

                <InputCard
                  label="Année"
                  value={data.vehicleYear}
                  onChange={(v) => onUpdate({ vehicleYear: v })}
                  placeholder="Ex: 2023"
                  type="number"
                  delay={4}
                />

                <InputCard
                  label="Immatriculation"
                  value={data.vehiclePlate}
                  onChange={(v) => onUpdate({ vehiclePlate: v })}
                  placeholder="Ex: AB-123-CD"
                  delay={5}
                />
              </div>
            </div>
          </CarouselStep>
        );

      case 'recap':
        const finalFare = getExampleFare();
        return (
          <CarouselStep>
            <div className="space-y-6">
              <CoachSpeech
                title="Parfait, on est prêt ! 🎉"
                message="Voici le résumé de ta configuration. Tu pourras tout modifier plus tard dans tes réglages."
              />

              <div className="space-y-3">
                <div className="bg-card rounded-2xl p-4 border border-border space-y-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Euro className="w-4 h-4" /> Tarification
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Prise en charge: <span className="font-bold">{data.baseFare || '0'}€</span></div>
                    <div>Par km: <span className="font-bold">{data.perKmRate}€</span></div>
                    {data.hourlyRate && <div>Par heure: <span className="font-bold">{data.hourlyRate}€</span></div>}
                    <div>Minimum: <span className="font-bold">{data.minimumPrice}€</span></div>
                  </div>
                  {finalFare && (
                    <p className="text-xs text-muted-foreground mt-2">
                      → Course 15km = <span className="text-primary font-semibold">{finalFare}€</span>
                    </p>
                  )}
                </div>

                <div className="bg-card rounded-2xl p-4 border border-border space-y-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Entreprise
                  </p>
                  <p className="font-bold">{data.companyName}</p>
                  {data.siret && <p className="text-xs text-muted-foreground">SIRET: {data.siret}</p>}
                </div>

                <div className="bg-card rounded-2xl p-4 border border-border space-y-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Car className="w-4 h-4" /> Véhicule
                  </p>
                  <p className="font-bold">
                    {data.vehicleBrand} {data.vehicleColor && `- ${data.vehicleColor}`}
                  </p>
                  {data.vehicleYear && <p className="text-xs text-muted-foreground">Année: {data.vehicleYear}</p>}
                </div>
              </div>

              <TipBox type="highlight" delay={3}>
                🚀 Tu peux toujours ajuster ces paramètres depuis ton tableau de bord !
              </TipBox>
            </div>
          </CarouselStep>
        );

      default:
        return null;
    }
  };

  // Labels personnalisés pour la navigation
  const getNextLabel = (): string => {
    switch (currentStep) {
      case 'welcome':
        return "C'est parti !";
      case 'vision':
        return "Je suis prêt";
      case 'hourly':
        return data.hourlyRate ? "Continuer" : "Passer";
      case 'company_details':
      case 'vehicle_details':
        return "Continuer";
      case 'recap':
        return "Valider et continuer";
      default:
        return "Continuer";
    }
  };

  const showSkip = ['hourly', 'company_details', 'vehicle_details'].includes(currentStep);

  return (
    <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
      {/* Main content area */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <div key={currentStep}>
            {renderStep()}
          </div>
        </AnimatePresence>
      </div>

      {/* Fixed navigation */}
      <CarouselNav
        currentStep={currentStepIndex}
        totalSteps={totalSteps}
        canGoNext={canProceed()}
        canGoBack={currentStepIndex > 0}
        onNext={goNext}
        onBack={goBack}
        nextLabel={getNextLabel()}
        showSkip={showSkip}
        onSkip={goNext}
      />
    </div>
  );
}
