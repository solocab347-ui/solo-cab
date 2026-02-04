import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ChatBubble, 
  ConversationContainer, 
  QuickReplies 
} from './conversation';
import { 
  ArrowRight, 
  CheckCircle2, 
  Euro, 
  Building2, 
  Car,
  Sparkles,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversationalSettingsStepProps {
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
  onUpdate: (updates: Partial<ConversationalSettingsStepProps['data']>) => void;
}

type ConversationPhase = 
  | 'welcome'
  | 'pricing_intro'
  | 'base_fare'
  | 'per_km'
  | 'hourly_rate'
  | 'minimum_price'
  | 'tva_question'
  | 'company_intro'
  | 'company_name'
  | 'company_details'
  | 'vehicle_intro'
  | 'vehicle_details'
  | 'summary';

const PHASE_MESSAGES: Record<ConversationPhase, string[]> = {
  welcome: [
    "👋 Salut ! Je suis ton mentor SoloCab.",
    "Je vais t'accompagner pas à pas pour configurer ton activité VTC. On va faire ça ensemble, comme si on discutait autour d'un café ☕",
    "Prêt à devenir vraiment indépendant ?"
  ],
  pricing_intro: [
    "💰 Commençons par le plus important : TES TARIFS !",
    "Sur SoloCab, c'est TOI qui décides combien tu vaux. Pas d'algorithme mystérieux, pas de commission cachée.",
    "Je vais t'expliquer chaque tarif pour que tu comprennes bien l'impact sur tes revenus."
  ],
  base_fare: [
    "🚗 Premier tarif : la PRISE EN CHARGE",
    "C'est le montant fixe que le client paie dès qu'il monte dans ta voiture, avant même de rouler.",
    "En moyenne en France : entre 8€ et 15€ selon ta zone. À Paris, c'est souvent autour de 10-12€.",
    "💡 Conseil : commence par 10€ si tu débutes, tu pourras ajuster ensuite !"
  ],
  per_km: [
    "📏 Maintenant : le PRIX AU KILOMÈTRE",
    "C'est ce que tu gagnes pour chaque km parcouru avec le client.",
    "En moyenne : 1,50€ à 2,50€/km. Les VTC premium montent jusqu'à 3€/km.",
    "💡 Pour une course de 20km avec prise en charge de 10€ et tarif de 2€/km, tu gagnes : 10€ + (20 × 2€) = 50€ !"
  ],
  hourly_rate: [
    "⏰ Le TARIF HORAIRE (optionnel mais malin !)",
    "Parfait pour les mises à disposition : mariages, événements, journées business...",
    "Les clients entreprises adorent ça ! Entre 45€ et 80€/h selon le standing.",
    "Tu peux laisser vide si tu ne proposes pas ce service pour l'instant."
  ],
  minimum_price: [
    "🎯 Le MINIMUM de course : ta protection !",
    "C'est le tarif plancher garanti, même pour 500 mètres.",
    "Ça t'évite les micro-courses qui te font perdre du temps et de l'argent.",
    "💡 Règle d'or : minimum = prise en charge + ~3-5 km. Ex: si prise en charge à 10€ et km à 2€, minimum autour de 15-20€."
  ],
  tva_question: [
    "📊 Dernière question tarifs : la TVA",
    "Tes prix incluent-ils déjà la TVA (TTC) ou sont-ils hors taxes (HT) ?",
    "La plupart des VTC indépendants affichent des prix TTC pour simplifier."
  ],
  company_intro: [
    "🏢 Parfait ! Passons à ton ENTREPRISE",
    "Ces infos apparaîtront sur tes factures et devis. C'est important pour tes clients pro !"
  ],
  company_name: [
    "Comment s'appelle ton entreprise VTC ?",
    "C'est le nom qui sera affiché sur ton profil public et tes documents officiels."
  ],
  company_details: [
    "📋 Super ! Et les infos légales ?",
    "SIRET, adresse... C'est optionnel maintenant, tu pourras les ajouter plus tard dans les réglages.",
    "Mais si tu les as sous la main, c'est le moment ! 😉"
  ],
  vehicle_intro: [
    "🚘 Dernière étape : TON VÉHICULE",
    "Les clients adorent savoir dans quelle voiture ils vont monter !",
    "Un beau véhicule bien présenté = plus de réservations."
  ],
  vehicle_details: [
    "Dis-moi tout sur ta voiture !",
    "La marque est importante, le reste tu peux compléter après."
  ],
  summary: [
    "🎉 BRAVO ! Tu as configuré tes tarifs comme un pro !",
    "Voici le récap de ce qu'on a défini ensemble :"
  ]
};

export function ConversationalSettingsStep({ data, driverName, onUpdate }: ConversationalSettingsStepProps) {
  const [phase, setPhase] = useState<ConversationPhase>('welcome');
  const [messageIndex, setMessageIndex] = useState(0);
  const [showInput, setShowInput] = useState(false);
  const [isTyping, setIsTyping] = useState(true);
  const [displayedMessages, setDisplayedMessages] = useState<Array<{
    text: string;
    isBot: boolean;
    phase: ConversationPhase;
  }>>([]);

  const firstName = driverName?.split(' ')[0] || 'Chauffeur';
  const currentMessages = PHASE_MESSAGES[phase] || [];

  // Simulate typing and display messages one by one
  useEffect(() => {
    if (messageIndex < currentMessages.length) {
      setIsTyping(true);
      const timer = setTimeout(() => {
        setDisplayedMessages(prev => [...prev, {
          text: currentMessages[messageIndex].replace('{name}', firstName),
          isBot: true,
          phase
        }]);
        setMessageIndex(prev => prev + 1);
        setIsTyping(false);
      }, 800 + Math.random() * 400);
      return () => clearTimeout(timer);
    } else if (messageIndex >= currentMessages.length && currentMessages.length > 0) {
      // Show input after all messages are displayed
      const timer = setTimeout(() => {
        setShowInput(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [messageIndex, currentMessages, firstName, phase]);

  const advancePhase = useCallback((nextPhase: ConversationPhase) => {
    setPhase(nextPhase);
    setMessageIndex(0);
    setShowInput(false);
    setIsTyping(true);
  }, []);

  const addUserMessage = useCallback((text: string) => {
    setDisplayedMessages(prev => [...prev, { text, isBot: false, phase }]);
  }, [phase]);

  const handleContinue = useCallback((userResponse?: string) => {
    if (userResponse) {
      addUserMessage(userResponse);
    }

    const phaseTransitions: Record<ConversationPhase, ConversationPhase> = {
      welcome: 'pricing_intro',
      pricing_intro: 'base_fare',
      base_fare: 'per_km',
      per_km: 'hourly_rate',
      hourly_rate: 'minimum_price',
      minimum_price: 'tva_question',
      tva_question: 'company_intro',
      company_intro: 'company_name',
      company_name: 'company_details',
      company_details: 'vehicle_intro',
      vehicle_intro: 'vehicle_details',
      vehicle_details: 'summary',
      summary: 'summary'
    };

    setTimeout(() => {
      advancePhase(phaseTransitions[phase]);
    }, 300);
  }, [phase, advancePhase, addUserMessage]);

  const renderPhaseInput = () => {
    switch (phase) {
      case 'welcome':
        return (
          <QuickReplies
            options={[
              { label: "C'est parti ! 🚀", value: 'start', variant: 'default' },
            ]}
            onSelect={() => handleContinue("C'est parti !")}
          />
        );

      case 'pricing_intro':
        return (
          <QuickReplies
            options={[
              { label: "Je suis prêt 💪", value: 'ready', variant: 'default' },
            ]}
            onSelect={() => handleContinue("Je suis prêt")}
          />
        );

      case 'base_fare':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <Card className="border-primary/20 bg-card/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Euro className="w-5 h-5 text-primary" />
                  <Label className="text-base font-semibold">Prise en charge</Label>
                </div>
                <div className="relative">
                  <NumericInput
                    value={data.baseFare}
                    onChange={(v) => onUpdate({ baseFare: v })}
                    placeholder="10.00"
                    className="h-12 text-lg pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                </div>
                <div className="flex gap-2">
                  {['8', '10', '12', '15'].map(val => (
                    <Badge 
                      key={val}
                      variant={data.baseFare === val ? "default" : "outline"}
                      className="cursor-pointer px-3 py-1"
                      onClick={() => onUpdate({ baseFare: val })}
                    >
                      {val}€
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Button 
              onClick={() => {
                addUserMessage(`Ma prise en charge : ${data.baseFare || '10'}€`);
                handleContinue();
              }}
              disabled={!data.baseFare}
              className="w-full h-12"
            >
              Continuer <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </motion.div>
        );

      case 'per_km':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <Card className="border-primary/20 bg-card/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Euro className="w-5 h-5 text-primary" />
                  <Label className="text-base font-semibold">Prix au kilomètre</Label>
                </div>
                <div className="relative">
                  <NumericInput
                    value={data.perKmRate}
                    onChange={(v) => onUpdate({ perKmRate: v })}
                    placeholder="1.80"
                    className="h-12 text-lg pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€/km</span>
                </div>
                <div className="flex gap-2">
                  {['1.50', '1.80', '2.00', '2.50'].map(val => (
                    <Badge 
                      key={val}
                      variant={data.perKmRate === val ? "default" : "outline"}
                      className="cursor-pointer px-3 py-1"
                      onClick={() => onUpdate({ perKmRate: val })}
                    >
                      {val}€
                    </Badge>
                  ))}
                </div>
                {data.baseFare && data.perKmRate && (
                  <div className="bg-primary/10 rounded-lg p-3 mt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span>Exemple : course de 15km = </span>
                      <strong className="text-primary">
                        {(parseFloat(data.baseFare) + (15 * parseFloat(data.perKmRate))).toFixed(2)}€
                      </strong>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <Button 
              onClick={() => {
                addUserMessage(`Mon tarif : ${data.perKmRate || '1.80'}€/km`);
                handleContinue();
              }}
              disabled={!data.perKmRate}
              className="w-full h-12"
            >
              Continuer <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </motion.div>
        );

      case 'hourly_rate':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <Card className="border-primary/20 bg-card/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Euro className="w-5 h-5 text-primary" />
                  <Label className="text-base font-semibold">Tarif horaire (optionnel)</Label>
                </div>
                <div className="relative">
                  <NumericInput
                    value={data.hourlyRate}
                    onChange={(v) => onUpdate({ hourlyRate: v })}
                    placeholder="45.00"
                    className="h-12 text-lg pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€/h</span>
                </div>
                <div className="flex gap-2">
                  {['45', '55', '65', '80'].map(val => (
                    <Badge 
                      key={val}
                      variant={data.hourlyRate === val ? "default" : "outline"}
                      className="cursor-pointer px-3 py-1"
                      onClick={() => onUpdate({ hourlyRate: val })}
                    >
                      {val}€/h
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => {
                  addUserMessage("Je passe pour l'instant");
                  handleContinue();
                }}
                className="flex-1 h-12"
              >
                Passer
              </Button>
              <Button 
                onClick={() => {
                  addUserMessage(`Mon tarif horaire : ${data.hourlyRate}€/h`);
                  handleContinue();
                }}
                disabled={!data.hourlyRate}
                className="flex-1 h-12"
              >
                Continuer <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        );

      case 'minimum_price':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <Card className="border-primary/20 bg-card/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Euro className="w-5 h-5 text-primary" />
                  <Label className="text-base font-semibold">Minimum de course</Label>
                </div>
                <div className="relative">
                  <NumericInput
                    value={data.minimumPrice}
                    onChange={(v) => onUpdate({ minimumPrice: v })}
                    placeholder="15.00"
                    className="h-12 text-lg pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                </div>
                {data.baseFare && data.perKmRate && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Info className="w-3.5 h-3.5" />
                    <span>
                      Suggestion basée sur tes tarifs : {(parseFloat(data.baseFare) + (3 * parseFloat(data.perKmRate))).toFixed(0)}€ à {(parseFloat(data.baseFare) + (5 * parseFloat(data.perKmRate))).toFixed(0)}€
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
            <Button 
              onClick={() => {
                addUserMessage(`Minimum course : ${data.minimumPrice || '15'}€`);
                handleContinue();
              }}
              className="w-full h-12"
            >
              Continuer <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </motion.div>
        );

      case 'tva_question':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <Card className="border-primary/20 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">TVA incluse dans les prix</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tes tarifs sont affichés TTC (recommandé)
                    </p>
                  </div>
                  <Switch
                    checked={data.tvaIncluded}
                    onCheckedChange={(v) => onUpdate({ tvaIncluded: v })}
                  />
                </div>
              </CardContent>
            </Card>
            <Button 
              onClick={() => {
                addUserMessage(data.tvaIncluded ? "Oui, TVA incluse (TTC)" : "Non, prix HT");
                handleContinue();
              }}
              className="w-full h-12"
            >
              Continuer <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </motion.div>
        );

      case 'company_intro':
        return (
          <QuickReplies
            options={[
              { label: "Allons-y ! 🏢", value: 'go', variant: 'default' },
            ]}
            onSelect={() => handleContinue("C'est parti pour l'entreprise")}
          />
        );

      case 'company_name':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <Card className="border-primary/20 bg-card/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <Label className="text-base font-semibold">Nom de l'entreprise</Label>
                </div>
                <Input
                  value={data.companyName}
                  onChange={(e) => onUpdate({ companyName: e.target.value })}
                  placeholder="Ex: VTC Excellence, Mon Chauffeur Privé..."
                  className="h-12 text-base"
                />
              </CardContent>
            </Card>
            <Button 
              onClick={() => {
                addUserMessage(`Mon entreprise : ${data.companyName}`);
                handleContinue();
              }}
              disabled={!data.companyName}
              className="w-full h-12"
            >
              Continuer <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </motion.div>
        );

      case 'company_details':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <Card className="border-primary/20 bg-card/50">
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">SIRET (optionnel)</Label>
                    <Input
                      value={data.siret}
                      onChange={(e) => onUpdate({ siret: e.target.value })}
                      placeholder="14 chiffres"
                      maxLength={14}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">SIREN (optionnel)</Label>
                    <Input
                      value={data.siren}
                      onChange={(e) => onUpdate({ siren: e.target.value })}
                      placeholder="9 chiffres"
                      maxLength={9}
                      className="h-10"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Adresse (optionnel)</Label>
                  <Input
                    value={data.companyAddress}
                    onChange={(e) => onUpdate({ companyAddress: e.target.value })}
                    placeholder="123 Rue..., 75001 Paris"
                    className="h-10"
                  />
                </div>
              </CardContent>
            </Card>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => {
                  addUserMessage("Je compléterai plus tard");
                  handleContinue();
                }}
                className="flex-1 h-12"
              >
                Plus tard
              </Button>
              <Button 
                onClick={() => {
                  addUserMessage("Infos entreprise ajoutées ✓");
                  handleContinue();
                }}
                className="flex-1 h-12"
              >
                Continuer <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        );

      case 'vehicle_intro':
        return (
          <QuickReplies
            options={[
              { label: "Parlons de ma voiture ! 🚗", value: 'go', variant: 'default' },
            ]}
            onSelect={() => handleContinue("Voici ma voiture")}
          />
        );

      case 'vehicle_details':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <Card className="border-primary/20 bg-card/50">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Car className="w-5 h-5 text-primary" />
                  <Label className="text-base font-semibold">Ton véhicule</Label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Marque *</Label>
                    <Input
                      value={data.vehicleBrand}
                      onChange={(e) => onUpdate({ vehicleBrand: e.target.value })}
                      placeholder="Mercedes, Tesla..."
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Année</Label>
                    <Input
                      value={data.vehicleYear}
                      onChange={(e) => onUpdate({ vehicleYear: e.target.value })}
                      placeholder="2023"
                      maxLength={4}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Couleur</Label>
                    <Input
                      value={data.vehicleColor}
                      onChange={(e) => onUpdate({ vehicleColor: e.target.value })}
                      placeholder="Noir, Blanc..."
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Plaque</Label>
                    <Input
                      value={data.vehiclePlate}
                      onChange={(e) => onUpdate({ vehiclePlate: e.target.value })}
                      placeholder="AA-123-BB"
                      className="h-10 uppercase"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Button 
              onClick={() => {
                const vehicleText = [data.vehicleBrand, data.vehicleColor, data.vehicleYear].filter(Boolean).join(' ');
                addUserMessage(`Mon véhicule : ${vehicleText || data.vehicleBrand}`);
                handleContinue();
              }}
              disabled={!data.vehicleBrand}
              className="w-full h-12"
            >
              Continuer <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </motion.div>
        );

      case 'summary':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <div className="text-center mb-4">
                  <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-2" />
                  <h3 className="font-bold text-lg">Configuration terminée !</h3>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Prise en charge</span>
                    <span className="font-semibold">{data.baseFare || '—'}€</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Prix/km</span>
                    <span className="font-semibold">{data.perKmRate || '—'}€</span>
                  </div>
                  {data.hourlyRate && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Tarif horaire</span>
                      <span className="font-semibold">{data.hourlyRate}€/h</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Minimum course</span>
                    <span className="font-semibold">{data.minimumPrice || '0'}€</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">TVA</span>
                    <span className="font-semibold">{data.tvaIncluded ? 'Incluse (TTC)' : 'Non incluse (HT)'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Entreprise</span>
                    <span className="font-semibold">{data.companyName || '—'}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Véhicule</span>
                    <span className="font-semibold">
                      {[data.vehicleBrand, data.vehicleColor].filter(Boolean).join(' ') || '—'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg p-4 text-center">
              <p className="text-sm font-medium">
                🎉 Tu peux passer à l'étape suivante !
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Clique sur "Suivant" en bas de l'écran
              </p>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ConversationContainer className="flex-1 min-h-0">
        <AnimatePresence mode="popLayout">
          {displayedMessages.map((msg, index) => (
            <ChatBubble
              key={`${msg.phase}-${index}`}
              message={msg.text}
              isBot={msg.isBot}
              delay={0}
            />
          ))}
        </AnimatePresence>
        
        {isTyping && messageIndex < currentMessages.length && (
          <ChatBubble message="" isBot isTyping />
        )}
      </ConversationContainer>

      {/* Input area */}
      <AnimatePresence>
        {showInput && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="pt-3 border-t bg-background/80 backdrop-blur-sm"
          >
            {renderPhaseInput()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
