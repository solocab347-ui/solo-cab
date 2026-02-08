import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  ExternalLink,
  Receipt
} from "lucide-react";

interface StripeTransaction {
  id: string;
  course_id: string;
  facture_id: string;
  transaction_type: string;
  gross_amount: number;
  stripe_fee_amount: number;
  solocab_fee_amount: number;
  net_amount: number;
  status: string;
  description: string;
  created_at: string;
  stripe_payment_intent_id: string;
}

interface StripeTransactionsTableProps {
  driverId: string;
  limit?: number;
}

export function StripeTransactionsTable({ driverId, limit = 20 }: StripeTransactionsTableProps) {
  const [transactions, setTransactions] = useState<StripeTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({
    gross: 0,
    stripeFees: 0,
    solocabFees: 0,
    net: 0,
    count: 0,
  });

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("stripe_transactions")
        .select("*")
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      setTransactions(data || []);

      // Calculer les totaux
      if (data && data.length > 0) {
        const totalsCalc = data.reduce(
          (acc, tx) => ({
            gross: acc.gross + (tx.gross_amount || 0),
            stripeFees: acc.stripeFees + (tx.stripe_fee_amount || 0),
            solocabFees: acc.solocabFees + (tx.solocab_fee_amount || 0),
            net: acc.net + (tx.net_amount || 0),
            count: acc.count + 1,
          }),
          { gross: 0, stripeFees: 0, solocabFees: 0, net: 0, count: 0 }
        );
        setTotals(totalsCalc);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (driverId) {
      fetchTransactions();
    }
  }, [driverId, limit]);

  const getTransactionTypeBadge = (type: string) => {
    switch (type) {
      case "deposit_payment":
        return <Badge variant="secondary">Acompte</Badge>;
      case "final_payment":
        return <Badge className="bg-blue-500">Solde</Badge>;
      case "full_payment":
        return <Badge className="bg-green-500">Paiement complet</Badge>;
      case "cancellation_fee":
        return <Badge className="bg-orange-500">Frais annulation</Badge>;
      case "refund":
        return <Badge className="bg-red-500">Remboursement</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "succeeded":
        return <Badge className="bg-green-500">Réussi</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">En attente</Badge>;
      case "failed":
        return <Badge className="bg-red-500">Échoué</Badge>;
      case "refunded":
        return <Badge className="bg-blue-500">Remboursé</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => `${amount.toFixed(2)} €`;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Transactions Stripe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Transactions Stripe Connect
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchTransactions}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualiser
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Résumé des totaux */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">Montant brut</p>
            <p className="text-lg font-bold">{formatCurrency(totals.gross)}</p>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
            <p className="text-xs text-red-600">Frais Stripe</p>
            <p className="text-lg font-bold text-red-600">-{formatCurrency(totals.stripeFees)}</p>
          </div>
          <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
            <p className="text-xs text-orange-600">Frais SoloCab</p>
            <p className="text-lg font-bold text-orange-600">-{formatCurrency(totals.solocabFees)}</p>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <p className="text-xs text-green-600">Net reçu</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(totals.net)}</p>
          </div>
        </div>

        {/* Tableau des transactions */}
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Aucune transaction Stripe pour le moment</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Brut</TableHead>
                  <TableHead className="text-right text-red-500">Frais</TableHead>
                  <TableHead className="text-right text-green-600">Net</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(tx.created_at), "dd/MM/yy HH:mm", { locale: fr })}
                    </TableCell>
                    <TableCell>
                      {getTransactionTypeBadge(tx.transaction_type)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(tx.gross_amount)}
                    </TableCell>
                    <TableCell className="text-right text-red-500 text-sm">
                      <div className="flex flex-col items-end">
                        <span>-{formatCurrency(tx.stripe_fee_amount + tx.solocab_fee_amount)}</span>
                        <span className="text-xs text-muted-foreground">
                          (S: {tx.stripe_fee_amount.toFixed(2)} + SC: {tx.solocab_fee_amount.toFixed(2)})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-semibold">
                      {formatCurrency(tx.net_amount)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(tx.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Note fiscale */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-sm">
          <p className="font-medium text-blue-800 dark:text-blue-200">
            📊 Pour votre comptabilité
          </p>
          <p className="text-blue-700 dark:text-blue-300 mt-1">
            Ce tableau récapitule toutes les transactions Stripe Connect. 
            Les frais affichés sont déductibles de votre chiffre d'affaires.
            Exportez vos factures pour votre comptable.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
