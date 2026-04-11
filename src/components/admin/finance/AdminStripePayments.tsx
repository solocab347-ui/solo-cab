import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CreditCard, ChevronLeft, ChevronRight, Search, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const AdminStripePayments = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchPI, setSearchPI] = useState("");
  const [cursor, setCursor] = useState<string | undefined>();
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async (startingAfter?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-stripe-data", {
        body: {
          action: "list_payment_intents",
          params: { limit: 25, starting_after: startingAfter },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPayments(data?.data || []);
      if (data?.data?.length > 0) {
        setCursor(data.data[data.data.length - 1].id);
      }
    } catch (err: any) {
      console.error("Error fetching Stripe PIs:", err);
    } finally {
      setLoading(false);
    }
  };

  const searchPayment = async () => {
    if (!searchPI.trim()) return fetchPayments();
    setLoading(true);
    try {
      if (searchPI.startsWith("pi_")) {
        const { data } = await supabase.functions.invoke("admin-stripe-data", {
          body: { action: "get_payment_intent", params: { id: searchPI.trim() } },
        });
        if (data && !data.error) {
          setPayments([data]);
        }
      } else {
        const { data } = await supabase.functions.invoke("admin-stripe-data", {
          body: {
            action: "search_payment_intents",
            params: { query: `metadata['driver_id']:'${searchPI.trim()}'`, limit: 25 },
          },
        });
        setPayments(data?.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const nextPage = () => {
    if (cursor) {
      setHistory((h) => [...h, payments[0]?.id]);
      fetchPayments(cursor);
    }
  };

  const prevPage = () => {
    if (history.length > 0) {
      const prev = history[history.length - 2];
      setHistory((h) => h.slice(0, -1));
      fetchPayments(prev);
    }
  };

  const statusColor = (s: string) => {
    if (s === "succeeded") return "default";
    if (s === "requires_capture") return "outline";
    if (s === "canceled") return "secondary";
    return "destructive";
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          Paiements Stripe (temps réel)
        </CardTitle>
        <div className="flex gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="pi_xxx ou driver_id..."
              value={searchPI}
              onChange={(e) => setSearchPI(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchPayment()}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Button size="sm" variant="outline" onClick={searchPayment} className="h-8">
            <Search className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setSearchPI(""); fetchPayments(); }} className="h-8">
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Chargement Stripe...</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PI ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">App Fee</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Aucun paiement</TableCell></TableRow>
                ) : payments.map((pi) => {
                  const appFee = pi.application_fee_amount ? (pi.application_fee_amount / 100).toFixed(2) : "—";
                  const dest = pi.transfer_data?.destination || "—";
                  return (
                    <TableRow key={pi.id}>
                      <TableCell className="text-[10px] font-mono max-w-[120px] truncate">{pi.id}</TableCell>
                      <TableCell className="text-xs">{format(new Date(pi.created * 1000), "dd/MM HH:mm")}</TableCell>
                      <TableCell className="text-right font-medium">{(pi.amount / 100).toFixed(2)}€</TableCell>
                      <TableCell className="text-right text-violet-600">{appFee}€</TableCell>
                      <TableCell className="text-[10px] font-mono max-w-[100px] truncate">{typeof dest === "string" ? dest : dest}</TableCell>
                      <TableCell>
                        <Badge variant={statusColor(pi.status) as any} className="text-[10px]">{pi.status}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between p-3 border-t">
              <Button size="sm" variant="ghost" disabled={history.length === 0} onClick={prevPage}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Précédent
              </Button>
              <Button size="sm" variant="ghost" disabled={payments.length < 25} onClick={nextPage}>
                Suivant <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminStripePayments;
