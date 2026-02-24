import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Users, Building2, Network, Loader2, CreditCard, Smartphone, Gift, BookOpen, AlignLeft } from "lucide-react";
import { toast } from "sonner";
import { generateEcosystemFlyer } from "@/lib/flyers/ecosystemFlyerGenerator";
import { generateDriverFlyer } from "@/lib/flyers/driverFlyerGenerator";
import { generateCompanyFlyer } from "@/lib/flyers/companyFlyerGenerator";
import { generateRevolutFlyer } from "@/lib/flyers/revolutFlyerGenerator";
import { generateSumupFlyer } from "@/lib/flyers/sumupFlyerGenerator";
import { generateCongressNfcFlyer } from "@/lib/flyers/congressNfcFlyerGenerator";
import { generateSolocabEbook } from "@/lib/ebooks/solocabEbookGenerator";
import { generateEbookRawTextPdf } from "@/lib/ebooks/ebookRawTextPdfGenerator";

import SolocabPodcastGenerator from "@/components/podcast/SolocabPodcastGenerator";

const AdminFlyers = () => {
  const [loading, setLoading] = useState<string | null>(null);

  const handleDownload = async (type: "ecosystem" | "driver" | "company" | "revolut" | "sumup" | "congress-nfc" | "ebook-solocab" | "ebook-raw-text") => {
    setLoading(type);
    try {
      switch (type) {
        case "ecosystem":
          await generateEcosystemFlyer();
          toast.success("Flyer Écosystème téléchargé !");
          break;
        case "driver":
          await generateDriverFlyer();
          toast.success("Flyer Chauffeurs téléchargé !");
          break;
        case "company":
          await generateCompanyFlyer();
          toast.success("Flyer Entreprises téléchargé !");
          break;
        case "revolut":
          await generateRevolutFlyer();
          toast.success("Flyer Revolut Business téléchargé !");
          break;
        case "sumup":
          await generateSumupFlyer();
          toast.success("Flyer SumUp téléchargé !");
          break;
        case "congress-nfc":
          await generateCongressNfcFlyer();
          toast.success("Flyer Congrès NFC téléchargé !");
          break;
        case "ebook-solocab":
          await generateSolocabEbook();
          toast.success("eBook SoloCab téléchargé !");
          break;
        case "ebook-raw-text":
          await generateEbookRawTextPdf();
          toast.success("Texte intégral eBook téléchargé !");
          break;
      }
    } catch (error) {
      console.error("Error generating flyer:", error);
      toast.error("Erreur lors de la génération du flyer");
    } finally {
      setLoading(null);
    }
  };

  const flyers = [
    {
      id: "ecosystem" as const,
      title: "Écosystème SoloCab",
      description: "Présentation complète de la plateforme avec tous les acteurs : chauffeurs, gestionnaires, entreprises, collaborateurs...",
      icon: Network,
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      gradient: "from-blue-500 to-purple-500",
    },
    {
      id: "driver" as const,
      title: "Avantages Chauffeurs",
      description: "Document promotionnel pour les chauffeurs VTC avec tous les avantages de rejoindre SoloCab.",
      icon: Users,
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      id: "company" as const,
      title: "Offre Entreprises",
      description: "Présentation des fonctionnalités entreprise : gestion des collaborateurs, facturation centralisée, reporting...",
      icon: Building2,
      color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
      gradient: "from-orange-500 to-red-500",
    },
    {
      id: "revolut" as const,
      title: "Revolut Business",
      description: "Flyer d'affiliation Revolut Business avec lien pour ouvrir un compte pro, liens de paiement, outils de comptabilité. 4 flyers par page A4.",
      icon: CreditCard,
      color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
      gradient: "from-indigo-500 to-blue-500",
    },
    {
      id: "sumup" as const,
      title: "Terminal SumUp",
      description: "Flyer d'affiliation pour le terminal de paiement SumUp Solo Lite. Encaissez vos clients par CB facilement. 4 flyers par page A4.",
      icon: Smartphone,
      color: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
      gradient: "from-teal-500 to-cyan-500",
    },
    {
      id: "congress-nfc" as const,
      title: "Congrès VTC - NFC Gratuit",
      description: "Flyer promotionnel pour le congrès VTC : plaque NFC et carte NFC GRATUITES offertes à chaque chauffeur. 4 flyers par page A4.",
      icon: Gift,
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      gradient: "from-amber-500 to-yellow-500",
    },
    {
      id: "ebook-solocab" as const,
      title: "📖 eBook - Guide Complet SoloCab",
      description: "eBook marketing de 33 pages : présentation de la plateforme, fonctionnalités chauffeurs, flottes, entreprises, tarification et bien plus.",
      icon: BookOpen,
      color: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      gradient: "from-rose-500 to-pink-500",
    },
    {
      id: "ebook-raw-text" as const,
      title: "📝 Texte Intégral eBook VTC",
      description: "Le texte brut complet de \"L'Illusion des Applications\" en PDF propre, sans mise en page marketing. Idéal pour relecture ou édition.",
      icon: AlignLeft,
      color: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
      gradient: "from-slate-500 to-gray-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Flyers & Documents</h2>
          <p className="text-sm text-muted-foreground">
            Téléchargez des documents PDF professionnels pour promouvoir SoloCab
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {flyers.map((flyer) => {
          const Icon = flyer.icon;
          const isLoading = loading === flyer.id;
          
          return (
            <Card key={flyer.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* Gradient header */}
              <div className={`h-2 bg-gradient-to-r ${flyer.gradient}`} />
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-xl ${flyer.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
                <CardTitle className="text-lg mt-3">{flyer.title}</CardTitle>
                <CardDescription className="text-sm">
                  {flyer.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <Button
                  onClick={() => handleDownload(flyer.id)}
                  disabled={isLoading}
                  className="w-full gap-2"
                  variant="outline"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Télécharger PDF
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Podcast Generator */}
      <SolocabPodcastGenerator />


      {/* Info box */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div className="text-sm">
              <p className="font-medium mb-1">Documents professionnels</p>
              <p className="text-muted-foreground">
                Ces flyers sont générés au format PDF A4, prêts à être imprimés ou partagés numériquement. 
                Ils incluent les informations légales de SoloCab et sont mis à jour automatiquement.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFlyers;
