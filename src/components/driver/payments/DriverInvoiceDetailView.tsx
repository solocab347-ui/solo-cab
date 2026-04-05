import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Receipt, 
  CreditCard, 
  TrendingDown, 
  TrendingUp, 
  CalendarDays,
  MapPin,
  User,
  Building2,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DriverInvoiceDetailViewProps {
  facture: {
    id: string;
    invoice_number: string;
    amount: number;
    created_at: string;
    paid_at?: string;
    payment_status: string;
    payment_method?: string;
    
    // Prix détaillés
    base_price?: number;
    distance_price?: number;
    time_price?: number;
    evening_surcharge_amount?: number;
    weekend_surcharge_amount?: number;
    peak_hours_surcharge_amount?: number;
    discount_amount?: number;
    promo_code?: string;
    
    // Frais
    is_stripe_payment?: boolean;
    solocab_fee_amount?: number;
    stripe_fee_amount?: number;
    total_fees_amount?: number;
    net_amount_to_driver?: number;
    
    // Acompte
    deposit_amount?: number;
    deposit_status?: string;
    final_payment_amount?: number;
    
    // Annulation
    cancelled_at?: string;
    cancellation_fee_amount?: number;
    cancellation_fee_charged?: boolean;
    
    // Tarification
    pricing_source?: string;
    city_pricing_name?: string;
    distance_km?: number;
    
    // Relations
    course?: {
      pickup_address: string;
      destination_address: string;
      scheduled_date: string;
    };
    client?: {
      profile?: {
        full_name: string;
      };
    };
    company?: {
      company_name: string;
    };
  };
  onDownload?: () => void;
}

export function DriverInvoiceDetailView({ facture, onDownload }: DriverInvoiceDetailViewProps) {
  const isStripe = facture.is_stripe_payment;
  const hasDeposit = (facture.deposit_amount || 0) > 0;
  const isCancelled = !!facture.cancelled_at;
  
  const formatCurrency = (amount?: number) => {
    return `${(amount || 0).toFixed(2)} €`;
  };

  const getPaymentStatusBadge = () => {
    switch (facture.payment_status) {
      case "paid":
        return <Badge className="bg-green-500">Payé</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">En attente</Badge>;
      case "refunded":
        return <Badge className="bg-blue-500">Remboursé</Badge>;
      default:
        return <Badge variant="secondary">{facture.payment_status}</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Receipt className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-xl">Facture {facture.invoice_number}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {format(new Date(facture.created_at), "dd MMMM yyyy", { locale: fr })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getPaymentStatusBadge()}
            {onDownload && (
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Informations course */}
        {facture.course && (
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-1 text-green-500" />
              <div className="text-sm">
                <span className="text-muted-foreground">Départ:</span> {facture.course.pickup_address}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-1 text-red-500" />
              <div className="text-sm">
                <span className="text-muted-foreground">Arrivée:</span> {facture.course.destination_address}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              {format(new Date(facture.course.scheduled_date), "EEEE dd MMMM yyyy 'à' HH:mm", { locale: fr })}
            </div>
            {facture.distance_km && (
              <div className="text-sm text-muted-foreground">
                Distance: {facture.distance_km.toFixed(1)} km
              </div>
            )}
          </div>
        )}

        {/* Client / Entreprise */}
        <div className="flex items-center gap-2 text-sm">
          {facture.company ? (
            <>
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>Entreprise: <strong>{facture.company.company_name}</strong></span>
            </>
          ) : facture.client?.profile?.full_name ? (
            <>
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Client: <strong>{facture.client.profile.full_name}</strong></span>
            </>
          ) : null}
        </div>

        <Separator />

        {/* Détail du prix */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Détail du prix
          </h4>
          <div className="space-y-1 text-sm">
            {facture.base_price !== undefined && facture.base_price > 0 && (
              <div className="flex justify-between">
                <span>Prix de base</span>
                <span>{formatCurrency(facture.base_price)}</span>
              </div>
            )}
            {facture.distance_price !== undefined && facture.distance_price > 0 && (
              <div className="flex justify-between">
                <span>Distance ({facture.distance_km?.toFixed(1)} km)</span>
                <span>{formatCurrency(facture.distance_price)}</span>
              </div>
            )}
            {facture.time_price !== undefined && facture.time_price > 0 && (
              <div className="flex justify-between">
                <span>Temps</span>
                <span>{formatCurrency(facture.time_price)}</span>
              </div>
            )}
            {facture.evening_surcharge_amount !== undefined && facture.evening_surcharge_amount > 0 && (
              <div className="flex justify-between text-orange-600">
                <span>Majoration soirée</span>
                <span>+{formatCurrency(facture.evening_surcharge_amount)}</span>
              </div>
            )}
            {facture.weekend_surcharge_amount !== undefined && facture.weekend_surcharge_amount > 0 && (
              <div className="flex justify-between text-orange-600">
                <span>Majoration week-end</span>
                <span>+{formatCurrency(facture.weekend_surcharge_amount)}</span>
              </div>
            )}
            {facture.peak_hours_surcharge_amount !== undefined && facture.peak_hours_surcharge_amount > 0 && (
              <div className="flex justify-between text-orange-600">
                <span>Majoration heures de pointe</span>
                <span>+{formatCurrency(facture.peak_hours_surcharge_amount)}</span>
              </div>
            )}
            {facture.discount_amount !== undefined && facture.discount_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Réduction {facture.promo_code && `(${facture.promo_code})`}</span>
                <span>-{formatCurrency(facture.discount_amount)}</span>
              </div>
            )}
          </div>
          
          <Separator className="my-2" />
          
          <div className="flex justify-between font-semibold">
            <span>Montant client</span>
            <span>{formatCurrency(facture.amount)}</span>
          </div>

          {/* Acompte si applicable */}
          {hasDeposit && (
            <div className="space-y-1 pt-2 border-t mt-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Acompte payé</span>
                <span className="text-green-600">-{formatCurrency(facture.deposit_amount)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span>Solde encaissé</span>
                <span>{formatCurrency(facture.final_payment_amount)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Frais (uniquement pour Stripe Connect) */}
        {isStripe && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Frais prélevés
              </h4>
               <div className="space-y-1 text-sm bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
                 <div className="flex justify-between font-semibold text-red-700 dark:text-red-400">
                   <span>Frais totaux</span>
                   <span>-{formatCurrency(facture.total_fees_amount)}</span>
                 </div>
                 <p className="text-[10px] text-red-500/70 mt-1">
                   Frais incluant traitement du paiement sécurisé et services SoloCab
                 </p>
               </div>
            </div>
          </>
        )}

        {/* Montant net chauffeur */}
        <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="font-semibold">Montant net reçu</span>
            </div>
            <span className="text-xl font-bold text-green-600">
              {formatCurrency(facture.net_amount_to_driver || facture.amount)}
            </span>
          </div>
          {isStripe && (
            <p className="text-xs text-muted-foreground mt-2">
              Ce montant a été viré sur votre compte bancaire
            </p>
          )}
        </div>

        {/* Mode de paiement */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span>
              {isStripe ? "Paiement via Stripe Connect" : `Paiement: ${facture.payment_method || "Autre"}`}
            </span>
          </div>
          {facture.pricing_source && (
            <Badge variant="outline" className="text-xs">
              {facture.pricing_source === "city" ? facture.city_pricing_name : "Tarif standard"}
            </Badge>
          )}
        </div>

        {/* Annulation */}
        {isCancelled && (
          <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Course annulée le {format(new Date(facture.cancelled_at!), "dd/MM/yyyy à HH:mm")}
            </p>
            {facture.cancellation_fee_charged && facture.cancellation_fee_amount && (
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Frais d'annulation encaissés: {formatCurrency(facture.cancellation_fee_amount)}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
