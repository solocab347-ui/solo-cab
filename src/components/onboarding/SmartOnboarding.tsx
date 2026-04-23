import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  User, 
  CreditCard, 
  FileText, 
  ChevronRight, 
  ChevronLeft,
  X,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Camera,
  Car,
  MapPin,
  Euro,
  Shield,
  Star,
  Lightbulb,
  Eye,
  Target,
  Users,
  QrCode,
  BarChart3,
  MessageSquare,
  Handshake,
  ArrowRight,
  Home,
  ExternalLink,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useDriverProfileCompletion, ProfileCompletionItem } from "@/hooks/useDriverProfileCompletion";

interface SmartOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  driverProfile: any;
}

// Type d'action : configurer (éditable) ou découvrir (informatif)
type FeatureActionType = "configure" | "discover";

// Guide sections explaining SoloCab features
const SOLOCAB_FEATURES = [
  {
    id: "intro",
    title: "Bienvenue sur SoloCab ! 🚗",
    description: "SoloCab est votre plateforme tout-en-un pour développer votre clientèle privée. Fini la dépendance aux plateformes classiques !",
    icon: <Home className="w-6 h-6" />,
    actionType: "discover" as FeatureActionType,
    actionLabel: "Commencer la visite",
    benefits: [
      "Clientèle 100% privée et fidèle",
      "Aucuns frais de transaction sur vos courses",
      "Outils professionnels complets",
      "QR Code personnel pour l'acquisition"
    ],
  },
  {
    id: "profile",
    title: "Votre Vitrine Publique",
    description: "Votre profil public est votre carte de visite digitale. Complétez-le avec vos informations, photo, et services pour attirer des clients.",
    icon: <User className="w-6 h-6" />,
    navigateTo: "profile",
    actionType: "configure" as FeatureActionType,
    actionLabel: "Personnaliser mon profil",
    benefits: [
      "Photo professionnelle à ajouter",
      "Description de vos services",
      "Secteurs d'intervention",
      "Équipements véhicule"
    ],
  },
  {
    id: "qrcode",
    title: "Votre QR Code Personnel",
    description: "Votre QR Code unique permet aux clients de s'inscrire chez vous instantanément. Imprimez-le sur vos cartes de visite ou affichez-le dans votre véhicule !",
    icon: <QrCode className="w-6 h-6" />,
    navigateTo: "qrcode",
    actionType: "discover" as FeatureActionType,
    actionLabel: "Voir mon QR Code",
    benefits: [
      "Déjà généré automatiquement",
      "À partager ou imprimer",
      "Lien d'inscription direct",
      "Suivi des scans en temps réel"
    ],
  },
  {
    id: "pricing",
    title: "Vos Tarifs Personnalisés",
    description: "Définissez vos tarifs : prise en charge, prix au km, tarif horaire, majorations heures de pointe et week-end. Tout est paramétrable !",
    icon: <Euro className="w-6 h-6" />,
    navigateTo: "tarification",
    actionType: "configure" as FeatureActionType,
    actionLabel: "Définir mes tarifs",
    benefits: [
      "Tarif de base à définir",
      "Prix au kilomètre",
      "Majorations automatiques",
      "Prix minimum configurable"
    ],
  },
  {
    id: "clients",
    title: "Mes Clients",
    description: "Retrouvez ici tous vos clients inscrits. Consultez leur historique de courses, ajoutez des notes, et gérez leur statut (exclusif ou partagé).",
    icon: <Users className="w-6 h-6" />,
    navigateTo: "clients",
    actionType: "discover" as FeatureActionType,
    actionLabel: "Voir mes clients",
    benefits: [
      "Liste des clients inscrits",
      "Historique par client",
      "Notes et préférences",
      "Statistiques de fidélité"
    ],
  },
  {
    id: "courses",
    title: "Gestion des Courses",
    description: "Créez et gérez vos courses. Les courses 'En attente' nécessitent confirmation, 'Confirmées' sont planifiées, 'Terminées' sont archivées.",
    icon: <FileText className="w-6 h-6" />,
    navigateTo: "courses",
    actionType: "discover" as FeatureActionType,
    actionLabel: "Voir mes courses",
    benefits: [
      "En attente = à confirmer",
      "Confirmées = planifiées",
      "Terminées = historique",
      "Factures générées auto"
    ],
  },
  {
    id: "quotes",
    title: "Devis Professionnels",
    description: "Créez des devis instantanés basés sur vos tarifs configurés. Le calcul du prix est automatique selon la distance et vos paramètres.",
    icon: <FileText className="w-6 h-6" />,
    navigateTo: "quotes",
    actionType: "discover" as FeatureActionType,
    actionLabel: "Créer un devis",
    benefits: [
      "Calcul automatique du prix",
      "Basé sur vos tarifs",
      "Envoi par email",
      "Conversion en course"
    ],
  },
  {
    id: "messages",
    title: "Messagerie",
    description: "Communiquez directement avec vos clients et partenaires chauffeurs. Tous vos échanges sont centralisés ici.",
    icon: <MessageSquare className="w-6 h-6" />,
    navigateTo: "messages",
    actionType: "discover" as FeatureActionType,
    actionLabel: "Voir mes messages",
    benefits: [
      "Chat avec les clients",
      "Échanges partenaires",
      "Historique conservé",
      "Notifications en temps réel"
    ],
  },
  {
    id: "partnerships",
    title: "Partenariats Chauffeurs",
    description: "Débordé ? Partagez vos courses avec d'autres chauffeurs de confiance. Définissez vos frais de transaction et gérez les paiements.",
    icon: <Handshake className="w-6 h-6" />,
    navigateTo: "sharing",
    actionType: "discover" as FeatureActionType,
    actionLabel: "Explorer les partenariats",
    benefits: [
      "Trouver des partenaires",
      "Partager des courses",
      "Frais de transaction configurable",
      "Suivi des paiements"
    ],
  },
  {
    id: "stats",
    title: "Statistiques",
    description: "Analysez votre activité : chiffre d'affaires, nombre de courses, clients les plus fidèles, et rentabilité par période.",
    icon: <BarChart3 className="w-6 h-6" />,
    navigateTo: "statistics",
    actionType: "discover" as FeatureActionType,
    actionLabel: "Voir mes statistiques",
    benefits: [
      "Chiffre d'affaires",
      "Évolution mensuelle",
      "Top clients",
      "Analyse de rentabilité"
    ],
  },
];

const SECTIONS = [
  { id: "discover", label: "Découvrir", icon: <Lightbulb className="w-4 h-4" /> },
  { id: "configure", label: "Configurer", icon: <Target className="w-4 h-4" /> },
  { id: "checklist", label: "Checklist", icon: <CheckCircle2 className="w-4 h-4" /> },
];

export const SmartOnboarding = ({ isOpen, onClose, onNavigate, driverProfile }: SmartOnboardingProps) => {
  const [selectedSection, setSelectedSection] = useState<"discover" | "configure" | "checklist">("discover");
  const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);
  const completion = useDriverProfileCompletion(driverProfile);

  // Save progress
  useEffect(() => {
    if (isOpen) {
      localStorage.setItem("smart-onboarding-last-visit", new Date().toISOString());
    }
  }, [isOpen]);

  const handleNavigateToFeature = (navigateTo?: string) => {
    if (navigateTo) {
      onNavigate(navigateTo);
      onClose();
    }
  };

  const handleNavigateToItem = (item: ProfileCompletionItem) => {
    onNavigate(item.navigateTo);
    onClose();
  };

  const handleNextFeature = () => {
    if (currentFeatureIndex < SOLOCAB_FEATURES.length - 1) {
      setCurrentFeatureIndex(prev => prev + 1);
    }
  };

  const handlePrevFeature = () => {
    if (currentFeatureIndex > 0) {
      setCurrentFeatureIndex(prev => prev - 1);
    }
  };

  const currentFeature = SOLOCAB_FEATURES[currentFeatureIndex];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="relative w-full h-[95vh] sm:h-auto sm:max-h-[90vh] max-w-lg mx-0 sm:mx-4 overflow-hidden rounded-t-3xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl border border-white/10 flex flex-col"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          {/* Header - Fixed */}
          <div className="flex-shrink-0 p-4 pb-3 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-0.5 shadow-lg shadow-orange-500/30">
                  <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                  </div>
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    Liberty
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-400 border-amber-500/30">
                      Guide
                    </Badge>
                  </h2>
                  <p className="text-xs text-white/60">
                    Profil à {completion.percentage}%
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Progress value={completion.percentage} className="w-16 h-1.5" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="w-8 h-8 text-white/60 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Section Tabs */}
            <div className="flex gap-1.5">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setSelectedSection(section.id as any)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium transition-all",
                    selectedSection === section.id
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
                      : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {section.icon}
                  <span>{section.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content - Scrollable, vertical only */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="p-4">
              {/* Discover Section */}
              {selectedSection === "discover" && (
                <div className="space-y-4">
                  {/* Feature Card */}
                  <motion.div
                    key={currentFeature.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white flex-shrink-0">
                        {currentFeature.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-white mb-1 break-words">{currentFeature.title}</h3>
                        <p className="text-sm text-white/70 break-words">{currentFeature.description}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {currentFeature.benefits.map((benefit, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs text-white/80">
                          <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
                          <span className="break-words">{benefit}</span>
                        </div>
                      ))}
                    </div>

                    {currentFeature.navigateTo ? (
                      <Button
                        onClick={() => handleNavigateToFeature(currentFeature.navigateTo)}
                        size="sm"
                        className={cn(
                          "mt-4 w-full",
                          currentFeature.actionType === "configure" 
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                            : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                        )}
                      >
                        {currentFeature.actionLabel || (currentFeature.actionType === "configure" ? "Configurer" : "Découvrir")}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    ) : currentFeature.actionLabel ? (
                      <Button
                        onClick={handleNextFeature}
                        size="sm"
                        className="mt-4 w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                      >
                        {currentFeature.actionLabel}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    ) : null}
                  </motion.div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePrevFeature}
                      disabled={currentFeatureIndex === 0}
                      className="text-white/60 hover:text-white h-8 px-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline ml-1">Préc.</span>
                    </Button>
                    
                    <div className="flex gap-1.5 flex-wrap justify-center max-w-[200px]">
                      {SOLOCAB_FEATURES.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentFeatureIndex(idx)}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full transition-all",
                            idx === currentFeatureIndex
                              ? "bg-amber-500 w-4"
                              : "bg-white/30 hover:bg-white/50"
                          )}
                        />
                      ))}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNextFeature}
                      disabled={currentFeatureIndex === SOLOCAB_FEATURES.length - 1}
                      className="text-white/60 hover:text-white h-8 px-2"
                    >
                      <span className="hidden sm:inline mr-1">Suiv.</span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Quick access cards - 2 columns on mobile, 3 on larger */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                    {SOLOCAB_FEATURES.slice(1, 4).map((feature) => (
                      <button
                        key={feature.id}
                        onClick={() => handleNavigateToFeature(feature.navigateTo)}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left group"
                      >
                        <div className="text-amber-400 mb-1.5">{feature.icon}</div>
                        <p className="text-xs font-medium text-white group-hover:text-amber-400 transition-colors line-clamp-2">
                          {feature.title}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Configure Section */}
              {selectedSection === "configure" && (
                <div className="space-y-4">
                  {/* Status Banner */}
                  {completion.isProfileReady ? (
                    <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-3 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-green-400 text-sm">Profil opérationnel ! 🎉</p>
                        <p className="text-xs text-green-300/80">Tous les éléments requis sont configurés</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-3 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-amber-400 text-sm">
                          {completion.requiredMissing.length} élément{completion.requiredMissing.length > 1 ? 's' : ''} requis
                        </p>
                        <p className="text-xs text-amber-300/80">Complétez-les pour activer votre profil</p>
                      </div>
                    </div>
                  )}

                  {/* Required Items */}
                  {completion.requiredMissing.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        Éléments requis
                      </h3>
                      <div className="space-y-2">
                        {completion.requiredMissing.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleNavigateToItem(item)}
                            className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-all text-left group flex items-start gap-2"
                          >
                            <div className="w-7 h-7 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                              <X className="w-3.5 h-3.5 text-red-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white text-sm group-hover:text-red-300 break-words">{item.label}</p>
                              <p className="text-xs text-white/60 break-words">{item.description}</p>
                              <p className="text-[10px] text-amber-400 mt-1 flex items-start gap-1">
                                <Lightbulb className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                <span className="break-words">{item.tip}</span>
                              </p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white/80 flex-shrink-0 mt-1" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended Items */}
                  {completion.recommendedMissing.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-400" />
                        Recommandés
                      </h3>
                      <div className="space-y-2">
                        {completion.recommendedMissing.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleNavigateToItem(item)}
                            className="w-full p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all text-left group flex items-start gap-2"
                          >
                            <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                              <Star className="w-3.5 h-3.5 text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white text-sm group-hover:text-amber-300 break-words">{item.label}</p>
                              <p className="text-xs text-white/60 break-words">{item.description}</p>
                              <p className="text-[10px] text-amber-400 mt-1 flex items-start gap-1">
                                <Lightbulb className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                <span className="break-words">{item.tip}</span>
                              </p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white/80 flex-shrink-0 mt-1" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Completed Items Summary */}
                  {completion.completedCount > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        Déjà configuré ({completion.completedCount})
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {completion.items.filter(i => i.isComplete).map((item) => (
                          <Badge 
                            key={item.id} 
                            className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] px-2 py-0.5"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                            {item.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Checklist Section */}
              {selectedSection === "checklist" && (
                <div className="space-y-3">
                  {/* Categories */}
                  {["profile", "billing", "visibility"].map((category) => {
                    const categoryItems = completion.items.filter(i => i.category === category);
                    const categoryCompleted = categoryItems.filter(i => i.isComplete).length;
                    const categoryLabel = {
                      profile: "Profil & Véhicule",
                      billing: "Tarification", 
                      visibility: "Visibilité",
                    }[category];
                    const categoryIcon = {
                      profile: <User className="w-4 h-4" />,
                      billing: <CreditCard className="w-4 h-4" />,
                      visibility: <Eye className="w-4 h-4" />,
                    }[category];

                    return (
                      <div key={category} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                        <div className="p-3 border-b border-white/10 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                              {categoryIcon}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-white text-sm truncate">{categoryLabel}</h3>
                              <p className="text-xs text-white/60">
                                {categoryCompleted}/{categoryItems.length}
                              </p>
                            </div>
                          </div>
                          <Progress 
                            value={(categoryCompleted / categoryItems.length) * 100} 
                            className="w-16 h-1.5 flex-shrink-0" 
                          />
                        </div>
                        <div className="p-1.5">
                          {categoryItems.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => handleNavigateToItem(item)}
                              className="w-full p-2.5 rounded-lg hover:bg-white/5 transition-all text-left flex items-center gap-2 group"
                            >
                              {item.isComplete ? (
                                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                              ) : item.priority === "required" ? (
                                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-white/30 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  "text-sm truncate",
                                  item.isComplete ? "text-white/60" : "text-white"
                                )}>
                                  {item.label}
                                </p>
                                {!item.isComplete && (
                                  <p className="text-[10px] text-white/40 truncate">{item.description}</p>
                                )}
                              </div>
                              {!item.isComplete && (
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-[10px] px-1.5 py-0 flex-shrink-0",
                                    item.priority === "required" 
                                      ? "border-red-500/50 text-red-400" 
                                      : item.priority === "recommended"
                                      ? "border-amber-500/50 text-amber-400"
                                      : "border-white/30 text-white/50"
                                  )}
                                >
                                  {item.priority === "required" ? "Requis" : item.priority === "recommended" ? "Reco." : "Opt."}
                                </Badge>
                              )}
                              <ArrowRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white/80 flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer - Fixed */}
          <div className="flex-shrink-0 p-3 border-t border-white/10 bg-white/5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-white/60 flex items-center gap-1 min-w-0">
                <Zap className="w-3 h-3 text-amber-400 flex-shrink-0" />
                <span className="truncate">Liberty vous aide !</span>
              </p>
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="text-white/60 hover:text-white h-7 text-xs flex-shrink-0"
              >
                Fermer
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SmartOnboarding;