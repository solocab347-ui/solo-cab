import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/logo-solocab.png";
import {
  Clock,
  CheckCircle,
  FileText,
  Users,
  TrendingUp,
  Shield,
  MessageSquare,
  BarChart3,
  LogOut,
} from "lucide-react";

const DriverPendingValidation = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [driverStatus, setDriverStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkDriverStatus();
    
    // Vérifier le statut toutes les 2 minutes pour éviter les re-renders excessifs
    const interval = setInterval(checkDriverStatus, 120000);
    return () => clearInterval(interval);
  }, [user]);

  const checkDriverStatus = async () => {
    if (!user) return;

    try {
      const { data: driver, error } = await supabase
        .from("drivers")
        .select("status")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      setDriverStatus(driver.status);

      // Rediriger si validé
      if (driver.status === "validated") {
        navigate("/driver-dashboard");
      }
    } catch (error) {
      console.error("Error checking driver status:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = () => {
    switch (driverStatus) {
      case "pending":
        return {
          icon: Clock,
          title: "Dossier en cours de traitement",
          description: "Votre demande d'inscription est en cours de vérification par notre équipe",
          color: "text-yellow-500",
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/20",
        };
      case "on_hold":
        return {
          icon: FileText,
          title: "Informations complémentaires requises",
          description: "Votre dossier nécessite des informations supplémentaires. Nous vous contacterons bientôt",
          color: "text-blue-500",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/20",
        };
      case "rejected":
        return {
          icon: Shield,
          title: "Demande non acceptée",
          description: "Malheureusement, votre demande d'inscription n'a pas été acceptée",
          color: "text-red-500",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/20",
        };
      default:
        return {
          icon: Clock,
          title: "Traitement en cours",
          description: "Nous examinons votre dossier",
          color: "text-yellow-500",
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/20",
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="SoloCab" className="w-12 h-12 object-contain" />
          </div>
          <Button variant="ghost" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Statut Card */}
        <Card className={`mb-8 border-2 ${statusInfo.borderColor}`}>
          <CardContent className="p-8 text-center">
            <div className={`w-20 h-20 ${statusInfo.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <StatusIcon className={`w-10 h-10 ${statusInfo.color}`} />
            </div>
            <h1 className="text-3xl font-bold mb-3">{statusInfo.title}</h1>
            <p className="text-lg text-muted-foreground mb-4">
              {statusInfo.description}
            </p>
            {driverStatus === "pending" && (
              <Badge variant="outline" className="text-base px-4 py-2">
                <Clock className="w-4 h-4 mr-2" />
                Délai de traitement : 24 à 48 heures maximum
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Services SoloCab */}
        {driverStatus !== "rejected" && (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-3">
                Bientôt disponible pour vous
              </h2>
              <p className="text-muted-foreground">
                Découvrez tous les services que SoloCab met à votre disposition
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card className="hover:shadow-elegant transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-dark rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary-foreground" />
                    </div>
                    Gestion des clients
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Gérez votre base de clients, créez des profils détaillés et suivez l'historique de chaque course
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-elegant transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-dark rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary-foreground" />
                    </div>
                    Devis & Facturation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Génération automatique de devis et factures professionnels avec numérotation unique
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-elegant transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-dark rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-primary-foreground" />
                    </div>
                    Statistiques en temps réel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Suivez votre chiffre d'affaires, vos courses et analysez votre performance avec des graphiques détaillés
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-elegant transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-dark rounded-lg flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-primary-foreground" />
                    </div>
                    Messagerie intégrée
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Communiquez directement avec vos clients via notre système de messagerie sécurisé
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-elegant transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-dark rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-primary-foreground" />
                    </div>
                    Promotions & Fidélisation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Créez des codes promo personnalisés et lancez des campagnes pour fidéliser vos clients
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-elegant transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-dark rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-primary-foreground" />
                    </div>
                    QR Code unique
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Obtenez votre QR code personnalisé pour faciliter l'inscription de nouveaux clients exclusifs
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Info complémentaire */}
            <Card className="bg-gradient-dark text-primary-foreground">
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-bold mb-2">
                  Nous préparons votre espace de travail
                </h3>
                <p className="opacity-90">
                  Notre équipe vérifie attentivement votre dossier pour garantir la sécurité et la qualité du service SoloCab.
                  Vous recevrez une notification par email dès que votre compte sera activé.
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {/* Message pour les refusés */}
        {driverStatus === "rejected" && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                Pour plus d'informations sur les raisons de ce refus, veuillez consulter l'email que nous vous avons envoyé
                ou contactez notre support.
              </p>
              <Button variant="outline" onClick={signOut}>
                Retour à l'accueil
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default DriverPendingValidation;
