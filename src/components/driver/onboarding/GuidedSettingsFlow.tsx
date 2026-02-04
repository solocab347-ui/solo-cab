import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Euro, Building2, Car, Sparkles, ArrowRight } from 'lucide-react';
import { 
  GuidedQuestion, 
  GuidedInputCard, 
  GuidedTransition,
  GuidedProgress 
} from './guided';

interface GuidedSettingsFlowProps {
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
  onUpdate: (updates: Partial<GuidedSettingsFlowProps['data']>) => void;
  onComplete?: () => void;
}

// Sections du flow
const SECTIONS = [
  { id: 'pricing', label: 'Tarifs', icon: '💰' },
  { id: 'company', label: 'Entreprise', icon: '🏢' },
  { id: 'vehicle', label: 'Véhicule', icon: '🚗' },
];

// Questions par section
type QuestionId = 
  | 'welcome' 
  | 'base_fare' 
  | 'per_km' 
  | 'hourly_rate' 
  | 'minimum_price' 
  | 'tva'
  | 'company_name'
  | 'company_details'
  | 'vehicle_brand'
  | 'vehicle_details'
  | 'summary';

const QUESTIONS: Record<QuestionId, {
  section: string;
  icon: string;
  title: string;
  explanation?: string;
  tip?: string;
}> = {
  welcome: {
    section: 'pricing',
    icon: '👋',
    title: 'Bienvenue ! Je vais t\'aider à configurer ton activité VTC.',
    explanation: 'On va définir tes tarifs, tes infos entreprise et ton véhicule. Ça prend 3 minutes et c\'est super important pour tes futurs clients !',
  },
  base_fare: {
    section: 'pricing',
    icon: '🚗',
    title: 'Combien coûte ta prise en charge ?',
    explanation: 'C\'est le montant fixe que le client paie dès qu\'il monte dans ta voiture, avant même de rouler.',
    tip: 'En moyenne : 8€ à 15€. À Paris, souvent autour de 10-12€.',
  },
  per_km: {
    section: 'pricing',
    icon: '📏',
    title: 'Quel est ton prix au kilomètre ?',
    explanation: 'C\'est ce que tu gagnes pour chaque km parcouru avec le client à bord.',
    tip: 'Moyenne nationale : 1,50€ à 2,50€/km. Les VTC premium vont jusqu\'à 3€/km.',
  },
  hourly_rate: {
    section: 'pricing',
    icon: '⏰',
    title: 'As-tu un tarif horaire ?',
    explanation: 'Idéal pour les mises à disposition : mariages, événements, journées business...',
    tip: 'Les entreprises adorent ça ! Entre 45€ et 80€/h selon ton standing.',
  },
  minimum_price: {
    section: 'pricing',
    icon: '🎯',
    title: 'Quel est ton minimum de course ?',
    explanation: 'C\'est le tarif plancher garanti, même pour une course de 500 mètres. Ça t\'évite les micro-courses qui te font perdre du temps.',
    tip: 'Règle d\'or : minimum = prise en charge + 3-5 km.',
  },
  tva: {
    section: 'pricing',
    icon: '📊',
    title: 'Tes prix incluent-ils la TVA ?',
    explanation: 'La plupart des VTC indépendants affichent des prix TTC pour simplifier la vie des clients.',
  },
  company_name: {
    section: 'company',
    icon: '🏢',
    title: 'Comment s\'appelle ton entreprise ?',
    explanation: 'C\'est le nom qui apparaîtra sur ton profil public et tes factures.',
  },
  company_details: {
    section: 'company',
    icon: '📋',
    title: 'Tes infos légales (optionnel)',
    explanation: 'SIRET, adresse... Tu peux les ajouter maintenant ou plus tard dans les réglages.',
  },
  vehicle_brand: {
    section: 'vehicle',
    icon: '🚘',
    title: 'Quelle est la marque de ton véhicule ?',
    explanation: 'Les clients adorent savoir dans quelle voiture ils vont monter. Un beau véhicule bien présenté = plus de réservations !',
  },
  vehicle_details: {
    section: 'vehicle',
    icon: '🎨',
    title: 'Quelques détails sur ton véhicule (optionnel)',
    explanation: 'Couleur, année, plaque... Ces infos rassurent les clients.',
  },
  summary: {
    section: 'vehicle',
    icon: '🎉',
    title: 'Parfait ! Voici le récap de ta configuration',
    explanation: 'Tu pourras modifier tout ça plus tard dans les réglages.',
  },
};

const QUESTION_ORDER: QuestionId[] = [
  'welcome',
  'base_fare',
  'per_km',
  'hourly_rate',
  'minimum_price',
  'tva',
  'company_name',
  'company_details',
  'vehicle_brand',
  'vehicle_details',
  'summary',
];

export function GuidedSettingsFlow({ 
  data, 
  driverName, 
  onUpdate,
  onComplete 
}: GuidedSettingsFlowProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState('');
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const firstName = driverName?.split(' ')[0] || 'Chauffeur';
  const currentQuestion = QUESTION_ORDER[currentQuestionIndex];
  const questionData = QUESTIONS[currentQuestion];
  const currentSection = questionData?.section || 'pricing';

  // Scroll en haut à chaque question
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentQuestionIndex]);

  const goToNext = useCallback((message?: string) => {
    if (message) {
      setTransitionMessage(message);
      setIsTransitioning(true);
    } else {
      if (currentQuestionIndex < QUESTION_ORDER.length - 1) {
        // Check if we're changing section
        const nextQuestion = QUESTION_ORDER[currentQuestionIndex + 1];
        const nextSection = QUESTIONS[nextQuestion]?.section;
        
        if (nextSection !== currentSection && !completedSections.includes(currentSection)) {
          setCompletedSections(prev => [...prev, currentSection]);
        }
        
        setCurrentQuestionIndex(prev => prev + 1);
      }
    }
  }, [currentQuestionIndex, currentSection, completedSections]);

  const handleTransitionComplete = useCallback(() => {
    setIsTransitioning(false);
    if (currentQuestionIndex < QUESTION_ORDER.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }, [currentQuestionIndex]);

  // Calcul de l'exemple pour le tarif km
  const getExamplePrice = () => {
    if (data.baseFare && data.perKmRate) {
      const total = parseFloat(data.baseFare) + (15 * parseFloat(data.perKmRate));
      return `${total.toFixed(2)}€`;
    }
    return null;
  };

  // Suggestion de minimum basée sur les tarifs
  const getSuggestedMinimum = () => {
    if (data.baseFare && data.perKmRate) {
      const min = parseFloat(data.baseFare) + (3 * parseFloat(data.perKmRate));
      const max = parseFloat(data.baseFare) + (5 * parseFloat(data.perKmRate));
      return `${min.toFixed(0)}€ à ${max.toFixed(0)}€`;
    }
    return '15€ à 25€';
  };

  const renderQuestionContent = () => {
    switch (currentQuestion) {
      case 'welcome':
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              onClick={() => goToNext()}
              className="w-full h-14 text-lg font-semibold gap-2"
              size="lg"
            >
              C'est parti ! 🚀
              <ArrowRight className="w-5 h-5" />
            </Button>
          </motion.div>
        );

      case 'base_fare':
        return (
          <GuidedInputCard
            type="numeric"
            label="Prise en charge"
            icon={Euro}
            value={data.baseFare}
            onChange={(v) => onUpdate({ baseFare: v as string })}
            placeholder="10.00"
            suffix="€"
            quickOptions={[
              { label: '8€', value: '8' },
              { label: '10€', value: '10' },
              { label: '12€', value: '12' },
              { label: '15€', value: '15' },
            ]}
            onContinue={() => goToNext('Prise en charge enregistrée ✓')}
            continueDisabled={!data.baseFare}
          />
        );

      case 'per_km':
        const examplePrice = getExamplePrice();
        return (
          <GuidedInputCard
            type="numeric"
            label="Prix au kilomètre"
            icon={Euro}
            value={data.perKmRate}
            onChange={(v) => onUpdate({ perKmRate: v as string })}
            placeholder="1.80"
            suffix="€/km"
            quickOptions={[
              { label: '1,50€', value: '1.50' },
              { label: '1,80€', value: '1.80' },
              { label: '2,00€', value: '2.00' },
              { label: '2,50€', value: '2.50' },
            ]}
            example={examplePrice ? {
              label: 'Exemple : course de 15km =',
              value: examplePrice
            } : undefined}
            onContinue={() => goToNext('Tarif km enregistré ✓')}
            continueDisabled={!data.perKmRate}
          />
        );

      case 'hourly_rate':
        return (
          <GuidedInputCard
            type="numeric"
            label="Tarif horaire"
            icon={Euro}
            value={data.hourlyRate}
            onChange={(v) => onUpdate({ hourlyRate: v as string })}
            placeholder="45.00"
            suffix="€/h"
            quickOptions={[
              { label: '45€/h', value: '45' },
              { label: '55€/h', value: '55' },
              { label: '65€/h', value: '65' },
              { label: '80€/h', value: '80' },
            ]}
            optional={true}
            showSkip={true}
            onSkip={() => goToNext()}
            onContinue={() => goToNext('Tarif horaire enregistré ✓')}
            continueDisabled={!data.hourlyRate}
          />
        );

      case 'minimum_price':
        return (
          <GuidedInputCard
            type="numeric"
            label="Minimum de course"
            icon={Euro}
            value={data.minimumPrice}
            onChange={(v) => onUpdate({ minimumPrice: v as string })}
            placeholder="15.00"
            suffix="€"
            quickOptions={[
              { label: '15€', value: '15' },
              { label: '18€', value: '18' },
              { label: '20€', value: '20' },
              { label: '25€', value: '25' },
            ]}
            example={{
              label: 'Suggestion basée sur tes tarifs :',
              value: getSuggestedMinimum()
            }}
            onContinue={() => goToNext('Minimum enregistré ✓')}
            continueDisabled={!data.minimumPrice}
          />
        );

      case 'tva':
        return (
          <GuidedInputCard
            type="switch"
            label="TVA incluse dans les prix"
            value={data.tvaIncluded}
            onChange={(v) => onUpdate({ tvaIncluded: v as boolean })}
            switchDescription="Tes tarifs sont affichés TTC (recommandé)"
            onContinue={() => goToNext('Préférence TVA enregistrée ✓')}
          />
        );

      case 'company_name':
        return (
          <GuidedInputCard
            type="text"
            label="Nom de l'entreprise"
            icon={Building2}
            value={data.companyName}
            onChange={(v) => onUpdate({ companyName: v as string })}
            placeholder="Ex: VTC Premium Services"
            onContinue={() => goToNext('Nom enregistré ✓')}
            continueDisabled={!data.companyName}
          />
        );

      case 'company_details':
        return (
          <div className="space-y-4">
            <GuidedInputCard
              type="text"
              label="SIRET"
              value={data.siret}
              onChange={(v) => onUpdate({ siret: v as string })}
              placeholder="123 456 789 00012"
              showContinue={false}
              optional={true}
            />
            <GuidedInputCard
              type="text"
              label="Adresse"
              value={data.companyAddress}
              onChange={(v) => onUpdate({ companyAddress: v as string })}
              placeholder="123 rue de Paris, 75001 Paris"
              showSkip={true}
              onSkip={() => goToNext()}
              onContinue={() => goToNext('Infos entreprise enregistrées ✓')}
              optional={true}
            />
          </div>
        );

      case 'vehicle_brand':
        return (
          <GuidedInputCard
            type="text"
            label="Marque du véhicule"
            icon={Car}
            value={data.vehicleBrand}
            onChange={(v) => onUpdate({ vehicleBrand: v as string })}
            placeholder="Ex: Mercedes, Tesla, Audi..."
            onContinue={() => goToNext('Marque enregistrée ✓')}
            continueDisabled={!data.vehicleBrand}
          />
        );

      case 'vehicle_details':
        return (
          <div className="space-y-4">
            <GuidedInputCard
              type="text"
              label="Couleur"
              value={data.vehicleColor}
              onChange={(v) => onUpdate({ vehicleColor: v as string })}
              placeholder="Ex: Noir, Blanc, Gris..."
              showContinue={false}
              optional={true}
            />
            <GuidedInputCard
              type="text"
              label="Année"
              value={data.vehicleYear}
              onChange={(v) => onUpdate({ vehicleYear: v as string })}
              placeholder="2023"
              showContinue={false}
              optional={true}
            />
            <GuidedInputCard
              type="text"
              label="Plaque d'immatriculation"
              value={data.vehiclePlate}
              onChange={(v) => onUpdate({ vehiclePlate: v as string })}
              placeholder="AB-123-CD"
              showSkip={true}
              onSkip={() => goToNext()}
              onContinue={() => goToNext('Véhicule enregistré ✓')}
              optional={true}
            />
          </div>
        );

      case 'summary':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Résumé des tarifs */}
            <div className="bg-card border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <span>💰</span>
                <span>Tes tarifs</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-muted-foreground">Prise en charge</span>
                  <p className="font-semibold">{data.baseFare}€</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-muted-foreground">Par km</span>
                  <p className="font-semibold">{data.perKmRate}€</p>
                </div>
                {data.hourlyRate && (
                  <div className="bg-muted/50 rounded-lg p-2">
                    <span className="text-muted-foreground">Tarif horaire</span>
                    <p className="font-semibold">{data.hourlyRate}€/h</p>
                  </div>
                )}
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-muted-foreground">Minimum</span>
                  <p className="font-semibold">{data.minimumPrice}€</p>
                </div>
              </div>
            </div>

            {/* Résumé entreprise */}
            <div className="bg-card border rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <span>🏢</span>
                <span>{data.companyName}</span>
              </div>
              {data.siret && (
                <p className="text-xs text-muted-foreground">SIRET: {data.siret}</p>
              )}
            </div>

            {/* Résumé véhicule */}
            <div className="bg-card border rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <span>🚗</span>
                <span>{data.vehicleBrand} {data.vehicleColor && `- ${data.vehicleColor}`}</span>
              </div>
              {data.vehiclePlate && (
                <p className="text-xs text-muted-foreground">{data.vehiclePlate}</p>
              )}
            </div>

            <GuidedInputCard
              type="text"
              label=""
              value=""
              onChange={() => {}}
              continueLabel="Continuer vers le profil →"
              onContinue={() => {
                setCompletedSections(prev => [...prev, 'vehicle']);
                onComplete?.();
              }}
            />
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Progress bar des sections */}
      <div className="px-4 py-3 border-b bg-background/95 backdrop-blur-sm">
        <GuidedProgress
          sections={SECTIONS}
          currentSection={currentSection}
          completedSections={completedSections}
        />
      </div>

      {/* Zone de contenu scrollable */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 pb-8">
          <AnimatePresence mode="wait">
            {isTransitioning ? (
              <GuidedTransition
                key="transition"
                message={transitionMessage}
                type="success"
                onComplete={handleTransitionComplete}
              />
            ) : (
              <motion.div
                key={currentQuestion}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <GuidedQuestion
                  icon={questionData?.icon}
                  title={questionData?.title || ''}
                  explanation={questionData?.explanation}
                  tip={questionData?.tip}
                  isActive={true}
                >
                  {renderQuestionContent()}
                </GuidedQuestion>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
