import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Users, Calendar, TrendingUp, QrCode, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const DriverDashboard = () => {
  const { signOut, user } = useAuth();
  const [driverProfile, setDriverProfile] = useState<any>(null);

  useEffect(() => {
    const fetchDriverProfile = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      const { data: driver } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      setDriverProfile({ ...profile, driver });
    };

    fetchDriverProfile();
  }, [user]);
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-premium rounded-lg flex items-center justify-center">
              <Car className="w-6 h-6 text-primary" />
            </div>
            <span className="text-2xl font-bold bg-gradient-dark bg-clip-text text-transparent">
              SoloCab
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="border-premium text-premium">
              {driverProfile?.driver?.status === "validated" ? "Chauffeur Vérifié" : "En attente de validation"}
            </Badge>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Bonjour, {driverProfile?.full_name?.split(" ")[0] || "Chauffeur"} 👋
          </h1>
          <p className="text-muted-foreground">
            Voici un aperçu de votre activité aujourd'hui
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 hover:shadow-elegant transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-trust rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-trust-foreground" />
              </div>
              <TrendingUp className="w-5 h-5 text-trust" />
            </div>
            <h3 className="text-2xl font-bold mb-1">12</h3>
            <p className="text-sm text-muted-foreground">Courses ce mois</p>
          </Card>

          <Card className="p-6 hover:shadow-elegant transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-premium rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-premium-foreground" />
              </div>
              <TrendingUp className="w-5 h-5 text-premium" />
            </div>
            <h3 className="text-2xl font-bold mb-1">8</h3>
            <p className="text-sm text-muted-foreground">Clients exclusifs</p>
          </Card>

          <Card className="p-6 hover:shadow-elegant transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-dark rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-primary-foreground" />
              </div>
              <TrendingUp className="w-5 h-5 text-foreground" />
            </div>
            <h3 className="text-2xl font-bold mb-1">3</h3>
            <p className="text-sm text-muted-foreground">Courses en attente</p>
          </Card>

          <Card className="p-6 hover:shadow-elegant transition-all bg-gradient-premium">
            <div className="mb-4">
              <div className="w-12 h-12 bg-premium-foreground/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-premium-foreground" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-premium-foreground mb-1">2 450€</h3>
            <p className="text-sm text-premium-foreground/80">Revenus ce mois</p>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* QR Code Section */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-premium rounded-lg flex items-center justify-center">
                <QrCode className="w-5 h-5 text-premium-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Votre QR Code</h2>
                <p className="text-sm text-muted-foreground">
                  Partagez-le avec vos clients
                </p>
              </div>
            </div>
            <div className="bg-secondary rounded-lg p-8 flex items-center justify-center mb-4">
              <div className="w-48 h-48 bg-card rounded-lg flex items-center justify-center">
                <QrCode className="w-32 h-32 text-muted-foreground" />
              </div>
            </div>
            <Button className="w-full bg-gradient-dark hover:opacity-90">
              Télécharger le QR Code
            </Button>
          </Card>

          {/* Recent Activity */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-6">Courses récentes</h2>
            <div className="space-y-4">
              {[
                { client: "Marie L.", date: "Aujourd'hui 14:30", amount: "45€", status: "completed" },
                { client: "Pierre D.", date: "Aujourd'hui 10:15", amount: "32€", status: "completed" },
                { client: "Sophie M.", date: "Hier 18:00", amount: "78€", status: "completed" },
              ].map((course, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-trust rounded-full flex items-center justify-center text-trust-foreground font-semibold">
                      {course.client.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold">{course.client}</p>
                      <p className="text-sm text-muted-foreground">{course.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-premium">{course.amount}</p>
                    <Badge variant="outline" className="border-trust text-trust mt-1">
                      Terminée
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              Voir toutes les courses
            </Button>
          </Card>
        </div>

        {/* Pending Quotes */}
        <Card className="p-6 mt-8">
          <h2 className="text-xl font-bold mb-6">Devis en attente</h2>
          <div className="space-y-3">
            {[
              { client: "Thomas B.", route: "Paris → Orly", date: "Demain 08:00" },
              { client: "Emma R.", route: "Versailles → CDG", date: "15 Nov, 16:30" },
            ].map((quote, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-premium transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-premium rounded-full flex items-center justify-center text-premium-foreground font-semibold">
                    {quote.client.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold">{quote.client}</p>
                    <p className="text-sm text-muted-foreground">{quote.route}</p>
                    <p className="text-sm text-muted-foreground">{quote.date}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    Refuser
                  </Button>
                  <Button size="sm" className="bg-gradient-premium">
                    Accepter
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DriverDashboard;
