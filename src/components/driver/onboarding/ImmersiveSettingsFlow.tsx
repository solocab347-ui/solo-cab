import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Settings, 
  Sparkles, 
  Euro, 
  Car, 
  Building2, 
  Rocket,
  Clock,
  MapPin,
  Calculator
} from 'lucide-react';
import {
  ImmersiveHeader,
  CoachMessage,
  QuestionCard,
  SelectionCard,
  ImmersiveInput,
  QuickOptions,
  FeatureList,
  ActionButtons
} from './immersive';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ImmersiveSettingsFlowProps {
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
  onUpdate: (updates: Partial<ImmersiveSettingsFlowProps['data']>) => void;
  onComplete?: () => void;
}

// Sections for header
const SECTIONS = [
  { id: 'welcome', icon: <Sparkles className="w-5 h-5" />, title: 'Bienvenue', subtitle: 'Configurons ton activité' },
  { id: 'pricing', icon: <Euro className="w-5 h-5" />, title: 'Tarification', subtitle: 'Tes prix de courses' },
  { id: 'company', icon: <Building2 className="w-5 h-5" />, title: 'Entreprise', subtitle: 'Infos légales' },
  { id: 'vehicle', icon: <Car className="w-5 h-5" />, title: 'Véhicule', subtitle: 'Ton véhicule' },
];

type StepId = 
  | 'welcome'
  | 'base_fare'
  | 'per_km'
  | 'hourly'
  | 'minimum'
  | 'tva'
  | 'company_name'
  | 'company_details'
  | 'vehicle_brand'
  | 'vehicle_details'
  | 'summary';

const STEP_SECTIONS: Record<StepId, number> = {
  welcome: 0,
  base_fare: 1,
  per_km: 1,
  hourly: 1,
  minimum: 1,
  tva: 1,
  company_name: 2,
  company_details: 2,
  vehicle_brand: 3,
  vehicle_details: 3,
  summary: 3,
};

const STEPS: StepId[] = [
  'welcome',
  'base_fare',
  'per_km',
  'hourly',
  'minimum',
  'tva',
  'company_name',
  'company_details',
  'vehicle_brand',
  'vehicle_details',
  'summary'
];

export function ImmersiveSettingsFlow({
  data,
  driverName,
  onUpdate,
  onComplete
}: ImmersiveSettingsFlowProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const firstName = driverName?.split(' ')[0] || 'Chauffeur';
  const currentStep = STEPS[currentStepIndex];
  const currentSectionIndex = STEP_SECTIONS[currentStep];
  const currentSection = SECTIONS[currentSectionIndex];
  
  const totalSteps = STEPS.length;

  // Scroll to top on step change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStepIndex]);

  const goNext = useCallback(() => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [currentStepIndex]);

  const goBack = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  // Calculations
  const getExampleFare = () => {
    if (data.baseFare && data.perKmRate) {
      const fare = parseFloat(data.baseFare) + (15 * parseFloat(data.perKmRate));
      return fare.toFixed(2);
    }
    return null;
  };

  const getSuggestedMinimum = () => {
    if (data.baseFare && data.perKmRate) {
      const base = parseFloat(data.baseFare);
      const km = parseFloat(data.perKmRate);
      return `${(base + 3 * km).toFixed(0)}€ - ${(base + 5 * km).toFixed(0)}€`;
    }
    return '15€ - 25€';
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="space-y-6 px-4 pb-6">
            <QuestionCard
              title={`Prêt à configurer ton activité VTC, ${firstName} ?`}
              hint="Je vais te guider étape par étape. Tes paramètres seront enregistrés automatiquement."
            >
              <CoachMessage
                message={`Salut ${firstName} ! En tant que chauffeur VTC, tu as besoin de définir clairement tes tarifs. Cette réponse va conditionner`}
                highlight="tout ton parcours : tes revenus, ton indépendance et ta réussite."
                delay={2}
              />
            </QuestionCard>

            <FeatureList
              features={[
                { text: "Je te pose", highlight: "une question à la fois" },
                { text: "Tes tarifs se configurent", highlight: "en temps réel" },
                { text: "Je t'explique", highlight: "chaque paramètre clairement" },
                { text: "Tu gardes", highlight: "le contrôle total" },
                { text: "Parcours adapté à", highlight: "ton profil de chauffeur" },
              ]}
              delay={4}
            />

            <ActionButtons
              primaryLabel="C'est parti !"
              primaryIcon={<Rocket className="w-5 h-5" />}
              onPrimary={goNext}
              delay={6}
            />
          </div>
        );

      case 'base_fare':
        return (
          <div className="space-y-6 px-4 pb-6">
            <QuestionCard
              title="Combien factures-tu pour la prise en charge ?"
              hint="C'est le montant fixe que le client paie dès qu'il monte. Tu peux mettre 0€ si tu ne veux pas de frais de prise en charge."
              showSparkles
            >
              <CoachMessage
                message="La prise en charge, c'est nouveau pour toi si tu viens des plateformes ! C'est un forfait de départ que TU décides. Sur les apps, c'est elles qui fixent. Ici, c'est TOI le patron. Tu peux le mettre à 0€ ou choisir un montant qui valorise ton déplacement."
                delay={1}
              />
            </QuestionCard>

            <ImmersiveInput
              type="numeric"
              value={data.baseFare}
              onChange={(v) => onUpdate({ baseFare: v })}
              placeholder="0.00"
              suffix="€"
              delay={3}
            />

            <QuickOptions
              options={[
                { label: 'Pas de prise en charge (0€)', value: '0' },
                { label: '3€', value: '3' },
                { label: '5€', value: '5' },
                { label: '8€', value: '8' },
                { label: '10€', value: '10' },
              ]}
              selectedValue={data.baseFare}
              onSelect={(v) => onUpdate({ baseFare: v })}
              delay={4}
            />

            <div className="text-center text-xs text-muted-foreground">
              💡 Conseil : Entre 5€ et 10€ est courant. 0€ si tu veux rester compétitif avec les apps.
            </div>

            <ActionButtons
              primaryLabel="Continuer"
              onPrimary={goNext}
              primaryDisabled={data.baseFare === ''}
              showBack
              onBack={goBack}
              delay={5}
            />
          </div>
        );

      case 'per_km':
        const exampleFare = getExampleFare();
        return (
          <div className="space-y-6 px-4 pb-6">
            <QuestionCard
              title="Quel est ton tarif au kilomètre ?"
              hint="C'est ce que tu gagnes pour chaque km parcouru avec ton client."
              showSparkles
            >
              <CoachMessage
                message="Le tarif km, c'est le cœur de ta rentabilité ! En moyenne les VTC facturent entre 1,50€ et 2,50€/km. Les véhicules premium peuvent aller jusqu'à 3€/km."
                delay={1}
              />
            </QuestionCard>

            <ImmersiveInput
              type="numeric"
              value={data.perKmRate}
              onChange={(v) => onUpdate({ perKmRate: v })}
              placeholder="1.80"
              suffix="€/km"
              delay={3}
            />

            <QuickOptions
              options={[
                { label: '1,50€', value: '1.50' },
                { label: '1,80€', value: '1.80' },
                { label: '2,00€', value: '2.00' },
                { label: '2,50€', value: '2.50' },
                { label: '3,00€', value: '3.00' },
              ]}
              selectedValue={data.perKmRate}
              onSelect={(v) => onUpdate({ perKmRate: v })}
              delay={4}
            />

            {exampleFare && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl p-4 border border-primary/30"
              >
                <div className="flex items-center gap-3">
                  <Calculator className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Exemple : course de 15km</p>
                    <p className="text-xl font-bold text-primary">{exampleFare}€</p>
                  </div>
                </div>
              </motion.div>
            )}

            <ActionButtons
              primaryLabel="Continuer"
              onPrimary={goNext}
              primaryDisabled={!data.perKmRate}
              showBack
              onBack={goBack}
              delay={5}
            />
          </div>
        );

      case 'hourly':
        return (
          <div className="space-y-6 px-4 pb-6">
            <QuestionCard
              title="As-tu un tarif horaire ?"
              hint="Idéal pour les mises à disposition : mariages, événements, journées business..."
              showSparkles
            >
              <CoachMessage
                message="Le tarif horaire, c'est un bonus pour toi ! Les entreprises adorent réserver à l'heure pour des événements. Entre 45€ et 80€/h selon ton standing. Tu peux passer cette étape si ça ne t'intéresse pas."
                delay={1}
              />
            </QuestionCard>

            <ImmersiveInput
              type="numeric"
              value={data.hourlyRate}
              onChange={(v) => onUpdate({ hourlyRate: v })}
              placeholder="45.00"
              suffix="€/h"
              delay={3}
            />

            <QuickOptions
              options={[
                { label: 'Pas de tarif horaire', value: '' },
                { label: '45€/h', value: '45' },
                { label: '55€/h', value: '55' },
                { label: '65€/h', value: '65' },
                { label: '80€/h', value: '80' },
              ]}
              selectedValue={data.hourlyRate}
              onSelect={(v) => onUpdate({ hourlyRate: v })}
              delay={4}
            />

            <ActionButtons
              primaryLabel={data.hourlyRate ? "Continuer" : "Passer cette étape"}
              onPrimary={goNext}
              showBack
              onBack={goBack}
              delay={5}
            />
          </div>
        );

      case 'minimum':
        return (
          <div className="space-y-6 px-4 pb-6">
            <QuestionCard
              title="Quel est ton minimum de course ?"
              hint="Le tarif plancher garanti, même pour une course très courte."
              showSparkles
            >
              <CoachMessage
                message="Le minimum de course te protège des micro-trajets qui te font perdre du temps et de l'argent. Règle d'or : minimum = prise en charge + 3 à 5 km."
                delay={1}
              />
            </QuestionCard>

            <ImmersiveInput
              type="numeric"
              value={data.minimumPrice}
              onChange={(v) => onUpdate({ minimumPrice: v })}
              placeholder="15.00"
              suffix="€"
              delay={3}
            />

            <QuickOptions
              options={[
                { label: '12€', value: '12' },
                { label: '15€', value: '15' },
                { label: '18€', value: '18' },
                { label: '20€', value: '20' },
                { label: '25€', value: '25' },
              ]}
              selectedValue={data.minimumPrice}
              onSelect={(v) => onUpdate({ minimumPrice: v })}
              delay={4}
            />

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center text-sm text-muted-foreground bg-muted/50 rounded-lg p-3"
            >
              💡 Suggestion basée sur tes tarifs : <span className="font-semibold text-foreground">{getSuggestedMinimum()}</span>
            </motion.div>

            <ActionButtons
              primaryLabel="Continuer"
              onPrimary={goNext}
              primaryDisabled={!data.minimumPrice}
              showBack
              onBack={goBack}
              delay={5}
            />
          </div>
        );

      case 'tva':
        return (
          <div className="space-y-6 px-4 pb-6">
            <QuestionCard
              title="Tes prix incluent-ils la TVA ?"
              hint="La plupart des VTC indépendants affichent des prix TTC pour simplifier."
              showSparkles
            >
              <CoachMessage
                message="Si tu es au régime de TVA, afficher les prix TTC évite les confusions avec tes clients. Si tu es en micro-entreprise sans TVA, cette option n'a pas d'impact."
                delay={1}
              />
            </QuestionCard>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card rounded-xl p-5 border border-border space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Prix TTC (TVA incluse)</Label>
                  <p className="text-sm text-muted-foreground">Recommandé pour la transparence</p>
                </div>
                <Switch
                  checked={data.tvaIncluded}
                  onCheckedChange={(v) => onUpdate({ tvaIncluded: v })}
                />
              </div>
            </motion.div>

            <ActionButtons
              primaryLabel="Continuer"
              onPrimary={goNext}
              showBack
              onBack={goBack}
              delay={4}
            />
          </div>
        );

      case 'company_name':
        return (
          <div className="space-y-6 px-4 pb-6">
            <QuestionCard
              title="Comment s'appelle ton entreprise ?"
              hint="C'est le nom qui apparaîtra sur ton profil public et tes factures."
              showSparkles
            >
              <CoachMessage
                message="Ton nom commercial, c'est ta marque ! Choisis quelque chose de pro et mémorable. Ça peut être ton nom ou un nom de société."
                delay={1}
              />
            </QuestionCard>

            <ImmersiveInput
              type="text"
              value={data.companyName}
              onChange={(v) => onUpdate({ companyName: v })}
              placeholder="Ex: VTC Premium Services"
              delay={3}
            />

            <ActionButtons
              primaryLabel="Continuer"
              onPrimary={goNext}
              primaryDisabled={!data.companyName.trim()}
              showBack
              onBack={goBack}
              delay={4}
            />
          </div>
        );

      case 'company_details':
        return (
          <div className="space-y-6 px-4 pb-6">
            <QuestionCard
              title="Tes informations légales"
              hint="SIRET, adresse... Tu peux les ajouter maintenant ou plus tard."
              showSparkles
            >
              <CoachMessage
                message="Ces infos sont optionnelles pour l'instant. Tu pourras les compléter plus tard dans tes réglages. Elles seront utiles pour tes factures professionnelles."
                delay={1}
              />
            </QuestionCard>

            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">SIRET (optionnel)</Label>
                <ImmersiveInput
                  type="text"
                  value={data.siret}
                  onChange={(v) => onUpdate({ siret: v })}
                  placeholder="123 456 789 00012"
                  delay={3}
                />
              </div>

              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Adresse (optionnel)</Label>
                <ImmersiveInput
                  type="text"
                  value={data.companyAddress}
                  onChange={(v) => onUpdate({ companyAddress: v })}
                  placeholder="123 rue de Paris, 75001 Paris"
                  delay={4}
                />
              </div>
            </div>

            <ActionButtons
              primaryLabel={data.siret || data.companyAddress ? "Continuer" : "Passer cette étape"}
              onPrimary={goNext}
              showBack
              onBack={goBack}
              delay={5}
            />
          </div>
        );

      case 'vehicle_brand':
        return (
          <div className="space-y-6 px-4 pb-6">
            <QuestionCard
              title="Quelle est la marque de ton véhicule ?"
              hint="Les clients adorent savoir dans quelle voiture ils vont monter !"
              showSparkles
            >
              <CoachMessage
                message="Un beau véhicule bien présenté = plus de réservations ! Dis-moi quelle marque tu conduis."
                delay={1}
              />
            </QuestionCard>

            <ImmersiveInput
              type="text"
              value={data.vehicleBrand}
              onChange={(v) => onUpdate({ vehicleBrand: v })}
              placeholder="Ex: Mercedes, Tesla, Audi..."
              delay={3}
            />

            <QuickOptions
              options={[
                { label: 'Mercedes', value: 'Mercedes' },
                { label: 'BMW', value: 'BMW' },
                { label: 'Audi', value: 'Audi' },
                { label: 'Tesla', value: 'Tesla' },
                { label: 'Peugeot', value: 'Peugeot' },
              ]}
              selectedValue={data.vehicleBrand}
              onSelect={(v) => onUpdate({ vehicleBrand: v })}
              delay={4}
            />

            <ActionButtons
              primaryLabel="Continuer"
              onPrimary={goNext}
              primaryDisabled={!data.vehicleBrand.trim()}
              showBack
              onBack={goBack}
              delay={5}
            />
          </div>
        );

      case 'vehicle_details':
        return (
          <div className="space-y-6 px-4 pb-6">
            <QuestionCard
              title="Quelques détails sur ton véhicule"
              hint="Couleur, année, plaque... Ces infos rassurent les clients."
              showSparkles
            >
              <CoachMessage
                message="Ces détails sont optionnels mais recommandés. Ils permettent à tes clients de te reconnaître facilement !"
                delay={1}
              />
            </QuestionCard>

            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Couleur (optionnel)</Label>
                <ImmersiveInput
                  type="text"
                  value={data.vehicleColor}
                  onChange={(v) => onUpdate({ vehicleColor: v })}
                  placeholder="Ex: Noir, Blanc, Gris..."
                  delay={3}
                />
              </div>

              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Année (optionnel)</Label>
                <ImmersiveInput
                  type="text"
                  value={data.vehicleYear}
                  onChange={(v) => onUpdate({ vehicleYear: v })}
                  placeholder="2023"
                  delay={4}
                />
              </div>

              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Plaque d'immatriculation (optionnel)</Label>
                <ImmersiveInput
                  type="text"
                  value={data.vehiclePlate}
                  onChange={(v) => onUpdate({ vehiclePlate: v })}
                  placeholder="AB-123-CD"
                  delay={5}
                />
              </div>
            </div>

            <ActionButtons
              primaryLabel="Voir le récapitulatif"
              onPrimary={goNext}
              showBack
              onBack={goBack}
              delay={6}
            />
          </div>
        );

      case 'summary':
        const summaryFare = getExampleFare();
        return (
          <div className="space-y-6 px-4 pb-6">
            <QuestionCard
              title="Parfait ! Voici ton récapitulatif"
              hint="Tu pourras modifier tout ça plus tard dans les réglages."
              showSparkles
            >
              <CoachMessage
                message={`Bravo ${firstName} ! Ta configuration est prête. Voici un aperçu de ce que verront tes futurs clients.`}
                delay={1}
              />
            </QuestionCard>

            {/* Summary cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              {/* Tarifs */}
              <div className="bg-card rounded-xl p-4 border border-border space-y-3">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Euro className="w-4 h-4" />
                  <span>Tes tarifs</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Prise en charge</p>
                    <p className="text-lg font-bold">{data.baseFare || '0'}€</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Par km</p>
                    <p className="text-lg font-bold">{data.perKmRate}€</p>
                  </div>
                  {data.hourlyRate && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Tarif horaire</p>
                      <p className="text-lg font-bold">{data.hourlyRate}€/h</p>
                    </div>
                  )}
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Minimum</p>
                    <p className="text-lg font-bold">{data.minimumPrice}€</p>
                  </div>
                </div>
                {summaryFare && (
                  <div className="text-center text-sm text-muted-foreground bg-primary/10 rounded-lg p-2">
                    Course de 15km = <span className="font-bold text-primary">{summaryFare}€</span>
                  </div>
                )}
              </div>

              {/* Entreprise */}
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center gap-2 text-primary font-semibold mb-2">
                  <Building2 className="w-4 h-4" />
                  <span>{data.companyName}</span>
                </div>
                {data.siret && (
                  <p className="text-xs text-muted-foreground">SIRET: {data.siret}</p>
                )}
                {data.tvaIncluded && (
                  <p className="text-xs text-muted-foreground">Prix TTC</p>
                )}
              </div>

              {/* Véhicule */}
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center gap-2 text-primary font-semibold mb-2">
                  <Car className="w-4 h-4" />
                  <span>{data.vehicleBrand} {data.vehicleColor && `- ${data.vehicleColor}`}</span>
                </div>
                {data.vehicleYear && (
                  <p className="text-xs text-muted-foreground">Année: {data.vehicleYear}</p>
                )}
                {data.vehiclePlate && (
                  <p className="text-xs text-muted-foreground">Plaque: {data.vehiclePlate}</p>
                )}
              </div>
            </motion.div>

            <ActionButtons
              primaryLabel="Continuer vers le profil"
              primaryIcon={<Sparkles className="w-5 h-5" />}
              onPrimary={() => onComplete?.()}
              showBack
              onBack={goBack}
              delay={4}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-background via-background to-muted/30">
      {/* Immersive Header */}
      <ImmersiveHeader
        icon={currentSection.icon}
        iconBgClass="bg-gradient-to-br from-cyan-500 to-teal-500"
        title={currentSection.title}
        subtitle={currentSection.subtitle}
        currentStep={currentStepIndex + 1}
        totalSteps={totalSteps}
      />

      {/* Scrollable content */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="min-h-full py-6">
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
        </div>
      </ScrollArea>
    </div>
  );
}
