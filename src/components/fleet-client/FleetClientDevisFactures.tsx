import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Receipt, Clock, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface FleetClientDevisFacturesProps {
  clientId: string;
}

export const FleetClientDevisFactures = ({ clientId }: FleetClientDevisFacturesProps) => {
  const [loading, setLoading] = useState(true);
  const [devis, setDevis] = useState<any[]>([]);
  const [factures, setFactures] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [clientId]);

  const fetchData = async () => {
    try {
      const [devisRes, facturesRes] = await Promise.all([
        supabase
          .from("devis")
          .select("*")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false }),
        supabase
          .from("factures")
          .select("*")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false }),
      ]);

      setDevis(devisRes.data || []);
      setFactures(facturesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="devis">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="devis" className="gap-2">
            <FileText className="w-4 h-4" />
            Devis ({devis.length})
          </TabsTrigger>
          <TabsTrigger value="factures" className="gap-2">
            <Receipt className="w-4 h-4" />
            Factures ({factures.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="devis" className="mt-6 space-y-4">
          {devis.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">Aucun devis</p>
            </Card>
          ) : (
            devis.map((d) => (
              <Card key={d.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={d.status === "accepted" ? "default" : d.status === "rejected" ? "destructive" : "secondary"}>
                          {d.status === "pending" && "En attente"}
                          {d.status === "accepted" && "Accepté"}
                          {d.status === "rejected" && "Refusé"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(d.created_at), "dd MMM yyyy", { locale: fr })}
                        </span>
                      </div>
                      <p className="font-medium">{d.amount?.toFixed(2)} €</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="factures" className="mt-6 space-y-4">
          {factures.length === 0 ? (
            <Card className="p-12 text-center">
              <Receipt className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">Aucune facture</p>
            </Card>
          ) : (
            factures.map((f) => (
              <Card key={f.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={f.payment_status === "paid" ? "default" : "secondary"}>
                          {f.payment_status === "paid" ? "Payée" : "En attente"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {f.payment_method === "stripe" && "💳 Carte en ligne"}
                          {f.payment_method === "card" && "💳 Carte (TPE)"}
                          {f.payment_method === "cash" && "💵 Espèces"}
                          {!["stripe", "card", "cash"].includes(f.payment_method) && (f.payment_method || "—")}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(f.created_at), "dd MMM yyyy", { locale: fr })}
                        </span>
                      </div>
                      <p className="font-medium">{f.amount?.toFixed(2)} €</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
