import { useState } from "react";
import { useLocale } from "@/hooks/useLocale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import {
  Heart,
  Cpu,
  Wrench,
  Eye,
  Handshake,
  Users,
  Gift,
  Ear,
  Shield,
  Download,
  ArrowLeft,
  CheckCircle,
  Stamp,
} from "lucide-react";
import { motion } from "framer-motion";
import { generateValuesCharter } from "@/lib/valuesCharterGenerator";
import logoSolocab from "@/assets/logo-solocab.png";

interface ValueCardProps {
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
  t: (key: string) => string;
  index: number;
}

const ValueCard = ({ icon, titleKey, descriptionKey, t, index }: ValueCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
  >
    <Card className="h-full bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <CardTitle className="text-lg font-semibold text-foreground">
            {t(titleKey)}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {t(descriptionKey)}
        </p>
        <div className="mt-4 flex justify-end">
          <Badge variant="outline" className="text-xs bg-primary/5 border-primary/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Engagement SoloCab
          </Badge>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const OurValues = () => {
  const { t } = useLocale();
  const [isGenerating, setIsGenerating] = useState(false);

  const values = [
    { icon: <Heart className="w-5 h-5" />, titleKey: "values.humanFirst.title", descriptionKey: "values.humanFirst.description" },
    { icon: <Cpu className="w-5 h-5" />, titleKey: "values.techForHumans.title", descriptionKey: "values.techForHumans.description" },
    { icon: <Wrench className="w-5 h-5" />, titleKey: "values.bestTools.title", descriptionKey: "values.bestTools.description" },
    { icon: <Eye className="w-5 h-5" />, titleKey: "values.visibility.title", descriptionKey: "values.visibility.description" },
    { icon: <Handshake className="w-5 h-5" />, titleKey: "values.healthyRelations.title", descriptionKey: "values.healthyRelations.description" },
    { icon: <Users className="w-5 h-5" />, titleKey: "values.unionNotConfusion.title", descriptionKey: "values.unionNotConfusion.description" },
    { icon: <Gift className="w-5 h-5" />, titleKey: "values.winWinPartnerships.title", descriptionKey: "values.winWinPartnerships.description" },
    { icon: <Ear className="w-5 h-5" />, titleKey: "values.listenToWorkers.title", descriptionKey: "values.listenToWorkers.description" },
    { icon: <Shield className="w-5 h-5" />, titleKey: "values.faithfulToValues.title", descriptionKey: "values.faithfulToValues.description" },
  ];

  const handleDownloadCharter = async () => {
    setIsGenerating(true);
    try {
      await generateValuesCharter(t);
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">{t("common.back") || "Retour"}</span>
            </Link>
            <div className="flex items-center gap-2">
              <img 
                src={logoSolocab} 
                alt="SoloCab Logo" 
                className="h-8 w-auto"
              />
              <span className="font-bold text-xl text-foreground">SoloCab</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/30 px-4 py-1">
              <Stamp className="w-4 h-4 mr-2" />
              Charte Officielle
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              {t("values.pageTitle")}
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              {t("values.pageSubtitle")}
            </p>
            
            {/* Download Button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col items-center gap-3"
            >
              <Button 
                size="lg" 
                onClick={handleDownloadCharter}
                disabled={isGenerating}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all"
              >
                <Download className="w-5 h-5" />
                {isGenerating ? "Génération en cours..." : t("values.downloadCharter")}
              </Button>
              <p className="text-sm text-muted-foreground max-w-md">
                {t("values.downloadDescription")}
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Separator />

      {/* Values Grid */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((value, index) => (
              <ValueCard
                key={value.titleKey}
                icon={value.icon}
                titleKey={value.titleKey}
                descriptionKey={value.descriptionKey}
                t={t}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Official Stamp Section */}
      <section className="py-16 bg-card/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto"
          >
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
              <img 
                src={logoSolocab} 
                alt="SoloCab Official Stamp" 
                className="relative h-24 w-auto mx-auto"
              />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Engagements Officiels SoloCab
            </h2>
            <p className="text-muted-foreground mb-6">
              Ces engagements sont les fondations de SoloCab. Ils guident chacune de nos décisions 
              et constituent notre promesse envers tous les acteurs du VTC : chauffeurs, gestionnaires 
              de flotte, entreprises et clients.
            </p>
            <Button 
              variant="outline" 
              size="lg"
              onClick={handleDownloadCharter}
              disabled={isGenerating}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Télécharger le document officiel
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SoloCab - Tous droits réservés
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <Link to="/privacy-policy" className="text-sm text-muted-foreground hover:text-primary transition">
              Politique de confidentialité
            </Link>
            <Link to="/terms-of-service" className="text-sm text-muted-foreground hover:text-primary transition">
              Conditions d'utilisation
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default OurValues;
