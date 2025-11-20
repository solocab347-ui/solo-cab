import { Card } from "@/components/ui/card";
import { Plus, QrCode, Calculator, TrendingUp, Car, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface DriverHomeProps {
  driverProfile: any;
  onTabChange: (tab: string) => void;
}

export const DriverHome = ({ driverProfile, onTabChange }: DriverHomeProps) => {
  const navigate = useNavigate();

  // Calculate stats
  const todayCourses = 0; // TODO: fetch from API
  const todayRevenue = 0; // TODO: fetch from API
  const monthClients = 2; // TODO: fetch from API - actual number from DB
  const monthCourses = 2; // TODO: fetch from API
  const monthCompleted = 0; // TODO: fetch from API
  const monthRevenue = 0; // TODO: fetch from API

  return (
    <div className="space-y-8">
      {/* Accès Rapide */}
      <div>
        <h2 className="text-xl font-bold mb-4">Accès Rapide</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {/* Nouvelle Course */}
          <Card 
            className="p-8 bg-gradient-trust hover:shadow-elegant transition-all cursor-pointer border-0"
            onClick={() => navigate("/create-course")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-trust-foreground/10 rounded-full flex items-center justify-center">
                <Plus className="w-8 h-8 text-trust-foreground" />
              </div>
              <h3 className="text-xl font-bold text-trust-foreground">Nouvelle Course</h3>
            </div>
          </Card>

          {/* Mon QR Code */}
          <Card 
            className="p-8 bg-gradient-magenta hover:shadow-elegant transition-all cursor-pointer border-0"
            onClick={() => onTabChange("qrcode")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-magenta-foreground/10 rounded-full flex items-center justify-center">
                <QrCode className="w-8 h-8 text-magenta-foreground" />
              </div>
              <h3 className="text-xl font-bold text-magenta-foreground">Mon QR Code</h3>
            </div>
          </Card>

          {/* Calculatrice */}
          <Card 
            className="p-8 bg-gradient-brown hover:shadow-elegant transition-all cursor-pointer border-0"
            onClick={() => onTabChange("pricing")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-brown-foreground/10 rounded-full flex items-center justify-center">
                <Calculator className="w-8 h-8 text-brown-foreground" />
              </div>
              <h3 className="text-xl font-bold text-brown-foreground">Calculatrice</h3>
            </div>
          </Card>
        </div>
      </div>

      {/* Aujourd'hui */}
      <div>
        <h2 className="text-xl font-bold mb-4">Aujourd'hui</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Courses */}
          <Card className="p-6 bg-gradient-trust hover:shadow-elegant transition-all border-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-trust-foreground/10 rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-trust-foreground" />
              </div>
              <div>
                <p className="text-sm text-trust-foreground/80 mb-1">Courses</p>
                <h3 className="text-4xl font-bold text-trust-foreground">{todayCourses}</h3>
              </div>
            </div>
          </Card>

          {/* Revenue */}
          <Card className="p-6 bg-gradient-warning hover:shadow-elegant transition-all border-0">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-warning-foreground/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-warning-foreground" />
              </div>
              <div>
                <p className="text-sm text-warning-foreground/80 mb-1">Revenue</p>
                <h3 className="text-4xl font-bold text-warning-foreground">{todayRevenue}€</h3>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Ce mois */}
      <div>
        <h2 className="text-xl font-bold mb-4">Ce mois</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {/* Clients */}
          <Card className="p-6 bg-gradient-trust hover:shadow-elegant transition-all border-0">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-trust-foreground/10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-trust-foreground" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-trust-foreground mb-1">{monthClients}</h3>
            <p className="text-sm text-trust-foreground/80">Clients</p>
          </Card>

          {/* Courses */}
          <Card className="p-6 bg-gradient-success hover:shadow-elegant transition-all border-0">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-success-foreground/10 rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 text-success-foreground" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-success-foreground mb-1">{monthCourses}</h3>
            <p className="text-sm text-success-foreground/80">Courses</p>
          </Card>

          {/* Terminées */}
          <Card className="p-6 bg-gradient-magenta hover:shadow-elegant transition-all border-0">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-magenta-foreground/10 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-magenta-foreground" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-magenta-foreground mb-1">{monthCompleted}</h3>
            <p className="text-sm text-magenta-foreground/80">Terminées</p>
          </Card>

          {/* CA Total */}
          <Card className="p-6 bg-gradient-warning hover:shadow-elegant transition-all border-0">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-warning-foreground/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-warning-foreground" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-warning-foreground mb-1">{monthRevenue}€</h3>
            <p className="text-sm text-warning-foreground/80">CA Total</p>
          </Card>
        </div>
      </div>
    </div>
  );
};
