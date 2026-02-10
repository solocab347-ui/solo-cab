import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Loader2,
  Package,
  CheckCircle,
  Clock,
  Truck,
  MapPin,
  ArrowLeft,
  Search,
} from "lucide-react";
import logo from "@/assets/logo-solocab.png";

interface OrderStep {
  id: string;
  label: string;
  status: "completed" | "pending" | "current";
  date: string | null;
}

interface Order {
  order_number: string;
  first_name: string;
  last_name: string;
  email: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  payment_status: string;
  delivery_status: string;
  tracking_number: string | null;
  estimated_delivery_date: string | null;
  created_at: string;
  steps: OrderStep[];
}

const TrackNfcOrder = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [trackingInput, setTrackingInput] = useState(searchParams.get("token") || "");
  const [order, setOrder] = useState<Order | null>(null);

  const handleTrack = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!trackingInput.trim()) {
      toast.error("Veuillez entrer un numéro de commande ou token de suivi");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("track-nfc-order", {
        body: {
          tracking_token: trackingInput.startsWith("NFC-") ? null : trackingInput,
          order_number: trackingInput.startsWith("NFC-") ? trackingInput : null,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Commande non trouvée");

      setOrder(data.order);
    } catch (error: any) {
      console.error("Erreur suivi:", error);
      toast.error(error.message || "Commande non trouvée");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "current":
        return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-500" />;
    }
  };

  const getDeliveryStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return <Badge className="bg-green-500">Livré</Badge>;
      case "shipped":
        return <Badge className="bg-blue-500">En cours de livraison</Badge>;
      case "preparing":
        return <Badge className="bg-orange-500">En préparation</Badge>;
      default:
        return <Badge variant="secondary">En attente</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-storefront-dark via-storefront to-storefront-light">
      {/* Header */}
      <header className="border-b border-border bg-storefront-dark backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="SoloCab" className="w-10 h-10 object-contain" />
            <span className="text-xl font-bold text-white">SoloCab</span>
          </Link>
          <Link to="/plaque-nfc">
            <Button variant="ghost" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-8">
          <Package className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">
            Suivi de commande
          </h1>
          <p className="text-gray-400">
            Entrez votre numéro de commande ou token de suivi
          </p>
        </div>

        {/* Search form */}
        <Card className="p-6 bg-white/5 border-white/10 mb-8">
          <form onSubmit={handleTrack} className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="tracking" className="sr-only">Numéro de commande</Label>
              <Input
                id="tracking"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                placeholder="NFC-xxx ou token de suivi"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </form>
        </Card>

        {/* Order details */}
        {order && (
          <div className="space-y-6">
            {/* Order header */}
            <Card className="p-6 bg-white/5 border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-400">Commande</p>
                  <p className="text-xl font-bold text-white">{order.order_number}</p>
                </div>
                {getDeliveryStatusBadge(order.delivery_status)}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Destinataire</p>
                  <p className="text-white">{order.first_name} {order.last_name}</p>
                </div>
                <div>
                  <p className="text-gray-400">Date de commande</p>
                  <p className="text-white">
                    {format(new Date(order.created_at), "d MMMM yyyy", { locale: fr })}
                  </p>
                </div>
              </div>

              {order.estimated_delivery_date && (
                <div className="mt-4 p-3 bg-blue-500/10 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Truck className="w-4 h-4" />
                    <span className="text-sm">
                      Livraison estimée : {format(new Date(order.estimated_delivery_date), "d MMMM yyyy", { locale: fr })}
                    </span>
                  </div>
                </div>
              )}

              {order.tracking_number && (
                <div className="mt-4 p-3 bg-green-500/10 rounded-lg">
                  <p className="text-sm text-gray-400">Numéro de suivi transporteur</p>
                  <p className="text-green-400 font-mono">{order.tracking_number}</p>
                </div>
              )}
            </Card>

            {/* Progress steps */}
            <Card className="p-6 bg-white/5 border-white/10">
              <h3 className="font-semibold text-white mb-6">Progression</h3>
              <div className="space-y-4">
                {order.steps.map((step, index) => (
                  <div key={step.id} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      {getStatusIcon(step.status)}
                      {index < order.steps.length - 1 && (
                        <div className={`w-0.5 h-8 mt-2 ${
                          step.status === "completed" ? "bg-green-500" : "bg-gray-600"
                        }`} />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className={`font-medium ${
                        step.status === "completed" ? "text-white" : "text-gray-500"
                      }`}>
                        {step.label}
                      </p>
                      {step.date && (
                        <p className="text-sm text-gray-400">
                          {format(new Date(step.date), "d MMMM yyyy à HH:mm", { locale: fr })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Shipping address */}
            <Card className="p-6 bg-white/5 border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-white">Adresse de livraison</h3>
              </div>
              <p className="text-gray-300">
                {order.first_name} {order.last_name}<br />
                {order.shipping_address}<br />
                {order.shipping_postal_code} {order.shipping_city}
              </p>
            </Card>
          </div>
        )}

        {/* Help */}
        <Card className="mt-8 p-6 bg-white/5 border-white/10 text-center">
          <p className="text-gray-400 mb-4">
            Un problème avec votre commande ?
          </p>
          <a href="mailto:support@solocab.fr">
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
              Contacter le support
            </Button>
          </a>
        </Card>
      </div>
    </div>
  );
};

export default TrackNfcOrder;
