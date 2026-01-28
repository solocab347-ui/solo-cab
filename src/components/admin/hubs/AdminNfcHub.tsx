import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Tag, Package, Truck, CheckCircle, Clock, Search, RefreshCw,
  Users, CreditCard, MapPin, Mail, Phone, User, Copy, ExternalLink,
  Loader2, AlertCircle, Euro
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";

// Composant pour gérer les chauffeurs NFC (assignation de tags)
import AdminDriversNfcManager from "../AdminDriversNfcManager";
// Composant pour gérer les commandes de plaques
import AdminNfcOrdersManager from "../AdminNfcOrdersManager";

interface NfcStats {
  totalDrivers: number;
  driversWithNfc: number;
  driversWithoutNfc: number;
  totalOrders: number;
  pendingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
}

const AdminNfcHub = () => {
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "drivers">("overview");
  const [stats, setStats] = useState<NfcStats | null>(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Récupérer stats chauffeurs
      const { data: drivers } = await supabase
        .from("drivers")
        .select("id, has_nfc_plate, nfc_tag_number")
        .eq("is_demo_account", false);

      // Récupérer stats commandes
      const { data: orders } = await supabase
        .from("nfc_plate_orders")
        .select("id, payment_status, delivery_status, amount");

      const paidOrders = orders?.filter(o => o.payment_status === "paid") || [];
      
      setStats({
        totalDrivers: drivers?.length || 0,
        driversWithNfc: drivers?.filter(d => d.has_nfc_plate || d.nfc_tag_number).length || 0,
        driversWithoutNfc: drivers?.filter(d => !d.has_nfc_plate && !d.nfc_tag_number).length || 0,
        totalOrders: paidOrders.length,
        pendingOrders: paidOrders.filter(o => o.delivery_status === "pending").length,
        shippedOrders: paidOrders.filter(o => o.delivery_status === "shipped").length,
        deliveredOrders: paidOrders.filter(o => o.delivery_status === "delivered").length,
        totalRevenue: paidOrders.reduce((acc, o) => acc + Number(o.amount || 0), 0),
      });
    } catch (error) {
      console.error("Error fetching NFC stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sous-onglets NFC */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="w-full grid grid-cols-3 h-auto">
          <TabsTrigger value="overview" className="gap-1.5 py-2">
            <Tag className="w-4 h-4" />
            <span className={isMobile ? "text-xs" : ""}>
              {isMobile ? "Stats" : "Vue d'ensemble"}
            </span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5 py-2">
            <Package className="w-4 h-4" />
            <span className={isMobile ? "text-xs" : ""}>
              {isMobile ? "Commandes" : "Commandes"}
            </span>
            {stats && stats.pendingOrders > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                {stats.pendingOrders}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="drivers" className="gap-1.5 py-2">
            <Users className="w-4 h-4" />
            <span className={isMobile ? "text-xs" : ""}>
              {isMobile ? "Tags" : "Assignation Tags"}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Tableau de bord NFC</h3>
            <Button variant="outline" size="sm" onClick={fetchStats}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>

          {/* Stats Grid - Responsive */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Chauffeurs avec NFC */}
            <Card className="border-primary/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Tag className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{stats?.driversWithNfc}</p>
                    <p className="text-xs text-muted-foreground">Avec NFC</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chauffeurs sans NFC */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Users className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.driversWithoutNfc}</p>
                    <p className="text-xs text-muted-foreground">Sans NFC</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Commandes à expédier */}
            <Card className={stats?.pendingOrders ? "border-orange-500/50" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stats?.pendingOrders ? "bg-orange-500/10" : "bg-muted"}`}>
                    <Clock className={`w-5 h-5 ${stats?.pendingOrders ? "text-orange-500" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${stats?.pendingOrders ? "text-orange-500" : ""}`}>
                      {stats?.pendingOrders}
                    </p>
                    <p className="text-xs text-muted-foreground">À expédier</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenus */}
            <Card className="border-green-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Euro className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-500">
                      {stats?.totalRevenue.toFixed(0)}€
                    </p>
                    <p className="text-xs text-muted-foreground">Revenus NFC</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <Package className="w-6 h-6 mx-auto mb-1 text-blue-500" />
                <p className="text-xl font-bold">{stats?.totalOrders}</p>
                <p className="text-xs text-muted-foreground">Total commandes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <Truck className="w-6 h-6 mx-auto mb-1 text-purple-500" />
                <p className="text-xl font-bold">{stats?.shippedOrders}</p>
                <p className="text-xs text-muted-foreground">En transit</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <CheckCircle className="w-6 h-6 mx-auto mb-1 text-green-500" />
                <p className="text-xl font-bold">{stats?.deliveredOrders}</p>
                <p className="text-xs text-muted-foreground">Livrées</p>
              </CardContent>
            </Card>
          </div>

          {/* Conversion Rate */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Taux d'adoption NFC</p>
                  <p className="text-xs text-muted-foreground">
                    Chauffeurs ayant une plaque NFC
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {stats?.totalDrivers 
                      ? Math.round((stats.driversWithNfc / stats.totalDrivers) * 100) 
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats?.driversWithNfc} / {stats?.totalDrivers}
                  </p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ 
                    width: `${stats?.totalDrivers 
                      ? (stats.driversWithNfc / stats.totalDrivers) * 100 
                      : 0}%` 
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setActiveTab("orders")}
            >
              <Package className="w-4 h-4 mr-2" />
              Gérer les commandes
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setActiveTab("drivers")}
            >
              <Tag className="w-4 h-4 mr-2" />
              Assigner des tags
            </Button>
          </div>
        </TabsContent>

        {/* Onglet Commandes */}
        <TabsContent value="orders" className="mt-4">
          <AdminNfcOrdersManager />
        </TabsContent>

        {/* Onglet Assignation Tags */}
        <TabsContent value="drivers" className="mt-4">
          <AdminDriversNfcManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminNfcHub;
