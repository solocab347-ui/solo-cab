import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Download, FileText, User, Car, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type ResultType = "driver" | "course" | "payment";

interface SearchResult {
  type: ResultType;
  id: string;
  title: string;
  subtitle: string;
  date: string;
  extra?: string;
}

interface Props {
  onSelectDriver?: (driverId: string) => void;
}

const AdminGlobalSearch = ({ onSelectDriver }: Props) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);
    try {
      const q = query.trim().toLowerCase();
      const allResults: SearchResult[] = [];

      // Search drivers
      const { data: drivers } = await supabase
        .from("drivers")
        .select("id, company_name, created_at, profiles:user_id(full_name, email, phone)")
        .or(`company_name.ilike.%${q}%`)
        .limit(10);

      // Also search by profile name/email
      const { data: profileDrivers } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(10);

      const driverUserIds = new Set((profileDrivers || []).map((p: any) => p.id));
      
      if (driverUserIds.size > 0) {
        const { data: matchedDrivers } = await supabase
          .from("drivers")
          .select("id, company_name, created_at, profiles:user_id(full_name, email)")
          .in("user_id", Array.from(driverUserIds))
          .limit(10);

        (matchedDrivers || []).forEach((d: any) => {
          allResults.push({
            type: "driver",
            id: d.id,
            title: d.profiles?.full_name || "N/A",
            subtitle: d.profiles?.email || "",
            date: d.created_at,
            extra: d.company_name,
          });
        });
      }

      (drivers || []).forEach((d: any) => {
        if (!allResults.find((r) => r.id === d.id)) {
          allResults.push({
            type: "driver",
            id: d.id,
            title: d.profiles?.full_name || "N/A",
            subtitle: d.profiles?.email || "",
            date: d.created_at,
            extra: d.company_name,
          });
        }
      });

      // Search courses by number or PI
      if (q.startsWith("pi_")) {
        const { data: piCourses } = await supabase
          .from("courses")
          .select("id, course_number, pickup_address, destination_address, final_payment_amount, status, updated_at, stripe_payment_intent_id")
          .ilike("stripe_payment_intent_id", `%${q}%`)
          .limit(10);

        (piCourses || []).forEach((c: any) => {
          allResults.push({
            type: "payment",
            id: c.id,
            title: `PI: ${c.stripe_payment_intent_id}`,
            subtitle: `${c.pickup_address?.split(",")[0]} → ${c.destination_address?.split(",")[0]}`,
            date: c.updated_at,
            extra: `${Number(c.final_payment_amount || 0).toFixed(2)}€`,
          });
        });
      }

      // Search courses by number
      const { data: courses } = await supabase
        .from("courses")
        .select("id, course_number, pickup_address, destination_address, final_payment_amount, status, updated_at")
        .or(`course_number.ilike.%${q}%,pickup_address.ilike.%${q}%,destination_address.ilike.%${q}%`)
        .limit(10);

      (courses || []).forEach((c: any) => {
        allResults.push({
          type: "course",
          id: c.id,
          title: `Course ${c.course_number || c.id.slice(0, 8)}`,
          subtitle: `${c.pickup_address?.split(",")[0]} → ${c.destination_address?.split(",")[0]}`,
          date: c.updated_at,
          extra: `${Number(c.final_payment_amount || 0).toFixed(2)}€ • ${c.status}`,
        });
      });

      setResults(allResults);
    } catch (err) {
      console.error(err);
      toast.error("Erreur de recherche");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.rpc("get_admin_payment_audit", { p_limit: 1000, p_offset: 0 });
      if (error) throw error;

      const rows = data as any[];
      const headers = ["Course", "Date", "Client", "Chauffeur", "Montant", "Frais SoloCab", "Net", "Paiement", "Statut", "Stripe PI"];
      const csv = [
        headers.join(","),
        ...rows.map((r: any) =>
          [r.course_number, r.course_date, `"${r.client_name}"`, `"${r.driver_name}"`, r.gross_amount, r.solocab_fee, r.net_amount, r.payment_method, r.payment_status, r.stripe_pi_id].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `solocab-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export CSV téléchargé");
    } catch (err) {
      console.error(err);
      toast.error("Erreur d'export");
    } finally {
      setExporting(false);
    }
  };

  const getIcon = (type: ResultType) => {
    switch (type) {
      case "driver": return <User className="w-4 h-4 text-blue-500" />;
      case "course": return <Car className="w-4 h-4 text-emerald-500" />;
      case "payment": return <CreditCard className="w-4 h-4 text-violet-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher chauffeur, course, pi_xxx, adresse..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                className="pl-10"
              />
            </div>
            <Button onClick={search} disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              {loading ? "..." : "Rechercher"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export Buttons */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={exporting}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV (paiements)
        </Button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{results.length} résultat(s)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {results.map((r, i) => (
                <div
                  key={`${r.type}-${r.id}-${i}`}
                  className="p-3 hover:bg-muted/50 cursor-pointer flex items-center gap-3"
                  onClick={() => r.type === "driver" && onSelectDriver?.(r.id)}
                >
                  {getIcon(r.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {r.extra && <p className="text-xs font-medium">{r.extra}</p>}
                    <p className="text-[10px] text-muted-foreground">{format(new Date(r.date), "dd/MM/yyyy")}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {r.type === "driver" ? "Chauffeur" : r.type === "course" ? "Course" : "Paiement"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminGlobalSearch;
