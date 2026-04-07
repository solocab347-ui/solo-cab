import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileSearch, ChevronLeft, ChevronRight } from "lucide-react";

interface AuditRow {
  course_id: string;
  course_number: string | null;
  course_date: string;
  client_name: string;
  driver_name: string;
  gross_amount: number;
  solocab_fee: number;
  net_amount: number;
  payment_method: string;
  payment_status: string;
  stripe_pi_id: string;
  stripe_transfer_id: string;
}

const AdminPaymentAudit = () => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  useEffect(() => {
    fetchAudit();
  }, [page]);

  const fetchAudit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_admin_payment_audit", {
        p_limit: pageSize,
        p_offset: page * pageSize,
      });
      if (error) throw error;
      setRows((data as any[]) || []);
    } catch (err) {
      console.error("Audit error:", err);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (s: string) => {
    if (s === "captured" || s === "paid") return "default";
    if (s === "pending") return "outline";
    if (s === "error" || s === "disputed") return "destructive";
    return "secondary";
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileSearch className="w-4 h-4 text-primary" />
          Audit des paiements
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Chargement...</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Chauffeur</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">Frais</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Stripe PI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">Aucune donnée</TableCell>
                  </TableRow>
                ) : rows.map((r) => (
                  <TableRow key={r.course_id}>
                    <TableCell className="text-xs font-mono">{r.course_number || r.course_id.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs">{new Date(r.course_date).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="text-xs">{r.client_name}</TableCell>
                    <TableCell className="text-xs">{r.driver_name}</TableCell>
                    <TableCell className="text-right text-sm">{Number(r.gross_amount).toFixed(2)}€</TableCell>
                    <TableCell className="text-right text-sm text-violet-600">{Number(r.solocab_fee).toFixed(2)}€</TableCell>
                    <TableCell className="text-right text-sm font-bold">{Number(r.net_amount).toFixed(2)}€</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.payment_method}</Badge></TableCell>
                    <TableCell><Badge variant={statusColor(r.payment_status) as any} className="text-[10px]">{r.payment_status}</Badge></TableCell>
                    <TableCell className="text-[10px] font-mono max-w-[120px] truncate">{r.stripe_pi_id || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between p-3 border-t">
              <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Précédent
              </Button>
              <span className="text-xs text-muted-foreground">Page {page + 1}</span>
              <Button size="sm" variant="ghost" disabled={rows.length < pageSize} onClick={() => setPage(p => p + 1)}>
                Suivant <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminPaymentAudit;
