import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Car, MapPin, Calendar, Clock, User, LogOut, Plus } from "lucide-react";

const ClientDashboard = () => {
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
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-trust rounded-full flex items-center justify-center text-trust-foreground text-sm font-semibold">
                M
              </div>
              <span className="font-medium hidden sm:inline">Marie</span>
            </div>
            <Button variant="ghost" size="icon">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Bonjour Marie 👋</h1>
          <p className="text-muted-foreground">
            Réservez votre prochaine course avec votre chauffeur
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="lg:col-span-2">
            <Card className="p-6 shadow-elegant">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-premium rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-premium-foreground" />
                </div>
                <h2 className="text-2xl font-bold">Nouvelle réservation</h2>
              </div>

              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pickup">Lieu de départ</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="pickup"
                        placeholder="Adresse de départ"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="destination">Destination</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-5 h-5 text-premium" />
                      <Input
                        id="destination"
                        placeholder="Adresse d'arrivée"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="date"
                        type="date"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Heure</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="time"
                        type="time"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passengers">Nombre de passagers</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="passengers"
                      type="number"
                      min="1"
                      max="8"
                      defaultValue="1"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="bg-secondary rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Distance estimée</span>
                    <span className="font-semibold">42 km</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Durée estimée</span>
                    <span className="font-semibold">35 min</span>
                  </div>
                  <div className="h-px bg-border my-3"></div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Prix estimé</span>
                    <span className="text-2xl font-bold text-premium">78€</span>
                  </div>
                </div>

                <Button className="w-full bg-gradient-premium hover:opacity-90 transition-opacity text-lg py-6">
                  Demander un devis
                </Button>
              </div>
            </Card>

            {/* My Bookings */}
            <Card className="p-6 mt-8">
              <h2 className="text-xl font-bold mb-6">Mes réservations</h2>
              <div className="space-y-4">
                {[
                  {
                    date: "15 Nov 2024",
                    time: "14:30",
                    from: "Paris 8ème",
                    to: "CDG Terminal 2",
                    status: "confirmed",
                    price: "65€",
                  },
                  {
                    date: "20 Nov 2024",
                    time: "09:00",
                    from: "Versailles",
                    to: "La Défense",
                    status: "pending",
                    price: "45€",
                  },
                ].map((booking, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-lg border border-border hover:border-premium transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold">{booking.date}</span>
                        <span className="text-muted-foreground">à {booking.time}</span>
                      </div>
                      <Badge
                        variant={booking.status === "confirmed" ? "default" : "outline"}
                        className={
                          booking.status === "confirmed"
                            ? "bg-gradient-trust border-0"
                            : "border-premium text-premium"
                        }
                      >
                        {booking.status === "confirmed" ? "Confirmée" : "En attente"}
                      </Badge>
                    </div>
                    <div className="space-y-1 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{booking.from}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-premium" />
                        <span>{booking.to}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-premium">{booking.price}</span>
                      <Button variant="outline" size="sm">
                        Détails
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Driver Info */}
          <div className="space-y-6">
            <Card className="p-6 bg-gradient-dark text-primary-foreground shadow-elegant">
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-gradient-premium rounded-full flex items-center justify-center text-premium-foreground text-3xl font-bold mx-auto mb-4">
                  JD
                </div>
                <h3 className="text-xl font-bold mb-1">Jean Dupont</h3>
                <p className="text-sm opacity-80">Votre chauffeur exclusif</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-primary-foreground/20">
                  <span className="text-sm opacity-80">Véhicule</span>
                  <span className="font-semibold">Mercedes Classe E</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-primary-foreground/20">
                  <span className="text-sm opacity-80">Note</span>
                  <span className="font-semibold">4.9 ⭐</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm opacity-80">Courses effectuées</span>
                  <span className="font-semibold">1,250+</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-bold mb-4">Statistiques</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Courses ce mois</span>
                    <span className="font-semibold">8</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-trust w-2/3"></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Dépenses totales</span>
                    <span className="font-semibold text-premium">450€</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-premium w-1/2"></div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
