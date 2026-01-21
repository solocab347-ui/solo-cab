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

// Guide sections explaining SoloCab features
const SOLOCAB_FEATURES = [
  {
    id: "intro",
    title: "Bienvenue sur SoloCab ! 🚗",
    description: "SoloCab est votre plateforme tout-en-un pour développer votre clientèle privée. Fini la dépendance aux plateformes classiques - construisez votre propre base de clients fidèles !",
    icon: <Home className="w-8 h-8" />,
    benefits: [
      "Clientèle 100% privée et fidèle",
      "Aucune commission sur vos courses",
      "Outils professionnels complets",
      "QR Code personnel pour l'acquisition"
    ],
  },
  {
    id: "profile",
    title: "Votre Vitrine Publique",
    description: "Votre profil public est votre carte de visite digitale. Les clients vous trouvent, voient vos services, vos tarifs et peuvent vous contacter directement.",
    icon: <User className="w-8 h-8" />,
    navigateTo: "profile",
    benefits: [
      "Visible sur la vitrine SoloCab",
      "Photo professionnelle et description",
      "Services et équipements mis en avant",
      "Avis clients et note visible"
    ],
  },
  {
    id: "qrcode",
    title: "QR Code Personnel",
    description: "Votre QR Code est un outil puissant d'acquisition. Imprimez-le, partagez-le - chaque scan peut devenir un nouveau client fidèle !",
    icon: <QrCode className="w-8 h-8" />,
    navigateTo: "qrcode",
    benefits: [
      "Acquisition de clients en direct",
      "À imprimer sur cartes de visite",
      "À afficher dans votre véhicule",
      "Suivi des scans et conversions"
    ],
  },
  {
    id: "pricing",
    title: "Tarification Personnalisée",
    description: "Définissez vos propres tarifs : base, km, horaire, majorations... Vous gardez le contrôle total de votre activité.",
    icon: <Euro className="w-8 h-8" />,
    navigateTo: "tarification",
    benefits: [
      "Tarifs de base et au kilomètre",
      "Majorations heures de pointe",
      "Prix minimum et forfaits",
      "Calcul automatique des devis"
    ],
  },
  {
    id: "clients",
    title: "Gestion de Clientèle",
    description: "Gérez vos clients, leurs préférences, leur historique. Construisez une relation durable avec chacun d'eux.",
    icon: <Users className="w-8 h-8" />,
    navigateTo: "clients",
    benefits: [
      "Clients exclusifs ou partagés",
      "Historique des courses",
      "Notes et préférences",
      "Campagnes de fidélisation"
    ],
  },
  {
    id: "courses",
    title: "Courses et Devis",
    description: "Gérez vos courses, créez des devis professionnels, facturez vos clients. Tout est automatisé et professionnel.",
    icon: <FileText className="w-8 h-8" />,
    navigateTo: "courses",
    benefits: [
      "Planning de courses intégré",
      "Devis automatiques",
      "Factures professionnelles",
      "Suivi des paiements"
    ],
  },
  {
    id: "partnerships",
    title: "Partenariats Chauffeurs",
    description: "Débordé ? Partagez des courses avec d'autres chauffeurs. Trouvez des partenaires de confiance pour ne jamais refuser un client.",
    icon: <Handshake className="w-8 h-8" />,
    navigateTo: "sharing",
    benefits: [
      "Réseau de chauffeurs partenaires",
      "Partage de courses",
      "Commission transparente",
      "Gestion des paiements"
    ],
  },
  {
    id: "stats",
    title: "Statistiques et Performance",
    description: "Suivez votre activité, analysez vos performances, identifiez vos opportunités de croissance.",
    icon: <BarChart3 className="w-8 h-8" />,
    navigateTo: "statistics",
    benefits: [
      "Chiffre d'affaires",
      "Courses par période",
      "Clients les plus fidèles",
      "Rentabilité par trajet"
    ],
  },
  {
    id: "messaging",
    title: "Messagerie Intégrée",
    description: "Communiquez avec vos clients et partenaires directement depuis la plateforme. Tout est centralisé.",
    icon: <MessageSquare className="w-8 h-8" />,
    navigateTo: "messages",
    benefits: [
      "Chat avec les clients",
      "Notifications en temps réel",
      "Historique des échanges",
      "Pièces jointes et photos"
    ],
  },
];

const SECTIONS = [
  { id: "discover", label: "Découvrir SoloCab", icon: <Lightbulb className="w-4 h-4" /> },
  { id: "configure", label: "Configurer mon espace", icon: <Target className="w-4 h-4" /> },
  { id: "checklist", label: "Ma checklist", icon: <CheckCircle2 className="w-4 h-4" /> },
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl border border-white/10"
        >
          {/* Header */}
          <div className="relative p-6 pb-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ 
                    scale: [1, 1.05, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                  className="relative"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-0.5 shadow-lg shadow-orange-500/30">
                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                      <Sparkles className="w-7 h-7 text-amber-400" />
                    </div>
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900"
                  />
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    Liberty
                    <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30">
                      Guide Intelligent
                    </Badge>
                  </h2>
                  <p className="text-sm text-white/60">
                    Profil complet à {completion.percentage}%
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Progress indicator */}
                <div className="hidden sm:flex items-center gap-2">
                  <Progress value={completion.percentage} className="w-24 h-2" />
                  <span className="text-sm text-white/60">{completion.completedCount}/{completion.totalCount}</span>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Section Tabs */}
            <div className="flex gap-2 mt-4">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setSelectedSection(section.id as any)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all",
                    selectedSection === section.id
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
                      : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {section.icon}
                  <span className="hidden sm:inline">{section.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="h-[calc(90vh-180px)]">
            <div className="p-6">
              {/* Discover Section */}
              {selectedSection === "discover" && (
                <div className="space-y-6">
                  {/* Feature Card */}
                  <motion.div
                    key={currentFeature.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-6 border border-white/10"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white flex-shrink-0">
                        {currentFeature.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-2">{currentFeature.title}</h3>
                        <p className="text-white/70">{currentFeature.description}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      {currentFeature.benefits.map((benefit, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-white/80">
                          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>

                    {currentFeature.navigateTo && (
                      <Button
                        onClick={() => handleNavigateToFeature(currentFeature.navigateTo)}
                        className="mt-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                      >
                        Configurer maintenant
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </motion.div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      onClick={handlePrevFeature}
                      disabled={currentFeatureIndex === 0}
                      className="text-white/60 hover:text-white"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Précédent
                    </Button>
                    
                    <div className="flex gap-2">
                      {SOLOCAB_FEATURES.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentFeatureIndex(idx)}
                          className={cn(
                            "w-2 h-2 rounded-full transition-all",
                            idx === currentFeatureIndex
                              ? "bg-amber-500 w-6"
                              : "bg-white/30 hover:bg-white/50"
                          )}
                        />
                      ))}
                    </div>

                    <Button
                      variant="ghost"
                      onClick={handleNextFeature}
                      disabled={currentFeatureIndex === SOLOCAB_FEATURES.length - 1}
                      className="text-white/60 hover:text-white"
                    >
                      Suivant
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>

                  {/* Quick access cards */}
                  <div className="grid grid-cols-3 gap-3 mt-6">
                    {SOLOCAB_FEATURES.slice(1, 4).map((feature) => (
                      <button
                        key={feature.id}
                        onClick={() => handleNavigateToFeature(feature.navigateTo)}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left group"
                      >
                        <div className="text-amber-400 mb-2">{feature.icon}</div>
                        <p className="text-sm font-medium text-white group-hover:text-amber-400 transition-colors">
                          {feature.title}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Configure Section */}
              {selectedSection === "configure" && (
                <div className="space-y-6">
                  {/* Status Banner */}
                  {completion.isProfileReady ? (
                    <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-green-400" />
                      <div>
                        <p className="font-medium text-green-400">Profil opérationnel ! 🎉</p>
                        <p className="text-sm text-green-300/80">Tous les éléments requis sont configurés</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
                      <AlertCircle className="w-6 h-6 text-amber-400" />
                      <div>
                        <p className="font-medium text-amber-400">
                          {completion.requiredMissing.length} élément{completion.requiredMissing.length > 1 ? 's' : ''} requis manquant{completion.requiredMissing.length > 1 ? 's' : ''}
                        </p>
                        <p className="text-sm text-amber-300/80">Complétez-les pour activer votre profil</p>
                      </div>
                    </div>
                  )}

                  {/* Required Items */}
                  {completion.requiredMissing.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        Éléments requis
                      </h3>
                      <div className="space-y-2">
                        {completion.requiredMissing.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleNavigateToItem(item)}
                            className="w-full p-4 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-all text-left group flex items-start gap-3"
                          >
                            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                              <X className="w-4 h-4 text-red-400" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-white group-hover:text-red-300">{item.label}</p>
                              <p className="text-sm text-white/60">{item.description}</p>
                              <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                                <Lightbulb className="w-3 h-3" />
                                {item.tip}
                              </p>
                            </div>
                            <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-white/80 flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended Items */}
                  {completion.recommendedMissing.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-400" />
                        Recommandés pour optimiser
                      </h3>
                      <div className="space-y-2">
                        {completion.recommendedMissing.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleNavigateToItem(item)}
                            className="w-full p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all text-left group flex items-start gap-3"
                          >
                            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                              <Star className="w-4 h-4 text-amber-400" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-white group-hover:text-amber-300">{item.label}</p>
                              <p className="text-sm text-white/60">{item.description}</p>
                              <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                                <Lightbulb className="w-3 h-3" />
                                {item.tip}
                              </p>
                            </div>
                            <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-white/80 flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Completed Items Summary */}
                  {completion.completedCount > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                        Déjà configuré ({completion.completedCount})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {completion.items.filter(i => i.isComplete).map((item) => (
                          <Badge 
                            key={item.id} 
                            className="bg-green-500/20 text-green-400 border-green-500/30"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
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
                <div className="space-y-4">
                  {/* Categories */}
                  {["profile", "billing", "visibility"].map((category) => {
                    const categoryItems = completion.items.filter(i => i.category === category);
                    const categoryCompleted = categoryItems.filter(i => i.isComplete).length;
                    const categoryLabel = {
                      profile: "Profil & Véhicule",
                      billing: "Tarification & Entreprise", 
                      visibility: "Visibilité",
                    }[category];
                    const categoryIcon = {
                      profile: <User className="w-5 h-5" />,
                      billing: <CreditCard className="w-5 h-5" />,
                      visibility: <Eye className="w-5 h-5" />,
                    }[category];

                    return (
                      <div key={category} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                              {categoryIcon}
                            </div>
                            <div>
                              <h3 className="font-semibold text-white">{categoryLabel}</h3>
                              <p className="text-sm text-white/60">
                                {categoryCompleted}/{categoryItems.length} complété{categoryCompleted > 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <Progress 
                            value={(categoryCompleted / categoryItems.length) * 100} 
                            className="w-24 h-2" 
                          />
                        </div>
                        <div className="p-2">
                          {categoryItems.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => handleNavigateToItem(item)}
                              className="w-full p-3 rounded-lg hover:bg-white/5 transition-all text-left flex items-center gap-3 group"
                            >
                              {item.isComplete ? (
                                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                              ) : item.priority === "required" ? (
                                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-white/30 flex-shrink-0" />
                              )}
                              <div className="flex-1">
                                <p className={cn(
                                  "font-medium",
                                  item.isComplete ? "text-white/60" : "text-white"
                                )}>
                                  {item.label}
                                </p>
                                {!item.isComplete && (
                                  <p className="text-xs text-white/40">{item.description}</p>
                                )}
                              </div>
                              {!item.isComplete && (
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-xs",
                                    item.priority === "required" 
                                      ? "border-red-500/50 text-red-400" 
                                      : item.priority === "recommended"
                                      ? "border-amber-500/50 text-amber-400"
                                      : "border-white/30 text-white/50"
                                  )}
                                >
                                  {item.priority === "required" ? "Requis" : item.priority === "recommended" ? "Recommandé" : "Optionnel"}
                                </Badge>
                              )}
                              <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white/80 flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 bg-white/5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/60">
                <Zap className="w-4 h-4 inline mr-1 text-amber-400" />
                Liberty est là pour vous aider à chaque étape !
              </p>
              <Button
                onClick={onClose}
                variant="ghost"
                className="text-white/60 hover:text-white"
              >
                Fermer le guide
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SmartOnboarding;
