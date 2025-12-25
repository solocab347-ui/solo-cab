import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Users,
  Search,
  Filter,
  SlidersHorizontal,
  Calendar,
  Car,
  TrendingUp,
  X,
} from "lucide-react";

interface FleetClient {
  id: string;
  client_id: string;
  registered_at: string;
  client?: {
    id: string;
    user_id: string;
    total_rides: number;
    profile?: {
      full_name: string;
      email: string;
    };
  };
}

interface FleetClientsListProps {
  clients: FleetClient[];
}

export const FleetClientsList = ({ clients }: FleetClientsListProps) => {
  // Search & Filters
  const [searchText, setSearchText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<string>("date");
  const [minRides, setMinRides] = useState(0);
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Calculate stats
  const stats = useMemo(() => {
    const totalRides = clients.reduce((acc, c) => acc + (c.client?.total_rides || 0), 0);
    const avgRides = clients.length > 0 ? Math.round(totalRides / clients.length) : 0;
    const activeClients = clients.filter(c => (c.client?.total_rides || 0) > 0).length;
    return { totalRides, avgRides, activeClients };
  }, [clients]);

  // Filter & Sort
  const filteredClients = useMemo(() => {
    let result = [...clients];

    // Text search
    if (searchText) {
      const search = searchText.toLowerCase();
      result = result.filter(c => {
        const name = c.client?.profile?.full_name?.toLowerCase() || "";
        const email = c.client?.profile?.email?.toLowerCase() || "";
        return name.includes(search) || email.includes(search);
      });
    }

    // Min rides filter
    if (minRides > 0) {
      result = result.filter(c => (c.client?.total_rides || 0) >= minRides);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      result = result.filter(c => {
        const registered = new Date(c.registered_at);
        const daysDiff = Math.floor((now.getTime() - registered.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (dateFilter) {
          case "week": return daysDiff <= 7;
          case "month": return daysDiff <= 30;
          case "quarter": return daysDiff <= 90;
          default: return true;
        }
      });
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.client?.profile?.full_name || "").localeCompare(b.client?.profile?.full_name || "");
        case "rides":
          return (b.client?.total_rides || 0) - (a.client?.total_rides || 0);
        case "date":
        default:
          return new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime();
      }
    });

    return result;
  }, [clients, searchText, minRides, dateFilter, sortBy]);

  const hasActiveFilters = searchText || minRides > 0 || dateFilter !== "all";

  const resetFilters = () => {
    setSearchText("");
    setMinRides(0);
    setDateFilter("all");
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-success/10 via-success/5 to-transparent border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-success/10">
                <Users className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total clients</p>
                <p className="text-2xl font-bold">{clients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Car className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total courses</p>
                <p className="text-2xl font-bold">{stats.totalRides}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 via-accent/5 to-transparent border-accent/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/10">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clients actifs</p>
                <p className="text-2xl font-bold">{stats.activeClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card className="bg-card/50 backdrop-blur border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-success" />
            Mes Clients inscrits
          </CardTitle>
          <CardDescription>
            {filteredClients.length} client{filteredClients.length > 1 ? "s" : ""} 
            {hasActiveFilters ? " (filtré)" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou email..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date d'inscription</SelectItem>
                  <SelectItem value="name">Nom</SelectItem>
                  <SelectItem value="rides">Nombre de courses</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant={showFilters ? "secondary" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filtres</span>
              </Button>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <Card className="border-border/50 bg-muted/20">
              <CardContent className="pt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Date Filter */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      Période d'inscription
                    </Label>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Toutes les dates" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les dates</SelectItem>
                        <SelectItem value="week">Cette semaine</SelectItem>
                        <SelectItem value="month">Ce mois</SelectItem>
                        <SelectItem value="quarter">3 derniers mois</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Min Rides Filter */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm">
                      <Car className="h-4 w-4" />
                      Courses minimum : {minRides}+
                    </Label>
                    <Slider
                      value={[minRides]}
                      onValueChange={([value]) => setMinRides(value)}
                      min={0}
                      max={50}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>

                {hasActiveFilters && (
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-2">
                      <X className="h-4 w-4" />
                      Réinitialiser les filtres
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Active Filters Badges */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Filtres actifs :</span>
              {searchText && (
                <Badge variant="secondary" className="gap-1">
                  "{searchText}"
                  <button onClick={() => setSearchText("")} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              )}
              {minRides > 0 && (
                <Badge variant="secondary" className="gap-1">
                  {minRides}+ courses
                  <button onClick={() => setMinRides(0)} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              )}
              {dateFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {dateFilter === "week" ? "Cette semaine" : dateFilter === "month" ? "Ce mois" : "3 mois"}
                  <button onClick={() => setDateFilter("all")} className="ml-1 hover:text-destructive">×</button>
                </Badge>
              )}
            </div>
          )}

          {/* Client List */}
          {clients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground mb-4">Aucun client inscrit pour le moment</p>
              <p className="text-sm text-muted-foreground">
                Créez une invitation ci-dessus ou partagez votre vitrine publique
              </p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8">
              <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">Aucun résultat pour ces critères</p>
              <Button variant="link" onClick={resetFilters} className="mt-2">
                Réinitialiser les filtres
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-success/20 text-success">
                        {(client.client?.profile?.full_name || "C").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{client.client?.profile?.full_name || "Client"}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Car className="w-3 h-3" />
                          {client.client?.total_rides || 0} courses
                        </span>
                        {client.client?.profile?.email && (
                          <span className="hidden sm:inline truncate max-w-[200px]">
                            {client.client.profile.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {new Date(client.registered_at).toLocaleDateString("fr-FR")}
                    </p>
                    {(client.client?.total_rides || 0) > 10 && (
                      <Badge variant="outline" className="text-xs border-success/50 text-success mt-1">
                        Client fidèle
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};