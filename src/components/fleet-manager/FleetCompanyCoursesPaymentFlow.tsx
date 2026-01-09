import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Building2,
  User,
  Euro,
  Loader2,
  CheckCircle,
  Clock,
  Send,
  AlertTriangle,
  Wallet,
  Car,
  MapPin,
  Info,
  ArrowRight,
  FileText,
  RefreshCw
} from "lucide-react";

interface FleetCompanyCoursesPaymentFlowProps {
  fleetManagerId: string;
}

interface CompanyCourse {
  id: string;
  course_id: string;
  driver_id: string;
  partnership_id: string;
  company_id: string | null;
  company_request_id: string | null;
  course_amount: number | null;
  commission_percentage: number | null;
  commission_amount: number | null;
  earnings_for_driver: number | null;
  equipment_type: string | null;
  payment_handled_by: string | null;
  payment_declared_by_driver: boolean;
  payment_declared_at: string | null;
  driver_commission_paid_to_fleet: boolean;
  fleet_to_driver_payment_pending: number | null;
  fleet_to_driver_payment_sent: boolean;
  fleet_payment_to_driver_status: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  course?: {
    pickup_address: string;
    destination_address: string;
    scheduled_date: string;
    status: string;
  };
  driver?: {
    id: string;
    vehicle_model: string;
    profile?: {
      full_name: string;
      profile_photo_url: string | null;
    };
  };
  company?: {
    company_name: string;
    logo_url: string | null;
  };
}

export const FleetCompanyCoursesPaymentFlow = ({ fleetManagerId }: FleetCompanyCoursesPaymentFlowProps) => {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CompanyCourse[]>([]);
  const [activeTab, setActiveTab] = useState("pending_payment");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [receivePaymentDialog, setReceivePaymentDialog] = useState<CompanyCourse | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("transfer");

  useEffect(() => {
    fetchCourses();
  }, [fleetManagerId]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("fleet_partner_courses")
        .select(`
          id,
          course_id,
          driver_id,
          partnership_id,
          company_id,
          company_request_id,
          course_amount,
          commission_percentage,
          commission_amount,
          earnings_for_driver,
          equipment_type,
          payment_handled_by,
          payment_declared_by_driver,
          payment_declared_at,
          driver_commission_paid_to_fleet,
          fleet_to_driver_payment_pending,
          fleet_to_driver_payment_sent,
          fleet_payment_to_driver_status,
          status,
          created_at,
          completed_at,
          course:courses(
            pickup_address,
            destination_address,
            scheduled_date,
            status
          )
        `)
        .eq("fleet_manager_id", fleetManagerId)
        .not("company_id", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch driver and company info
      if (data && data.length > 0) {
        const driverIds = [...new Set(data.map(c => c.driver_id))];
        const companyIds = [...new Set(data.map(c => c.company_id).filter(Boolean))];

        const [driversResult, companiesResult] = await Promise.all([
          supabase.from("drivers").select("id, vehicle_model, user_id").in("id", driverIds),
          companyIds.length > 0 
            ? supabase.from("companies").select("id, company_name, logo_url").in("id", companyIds as string[])
            : Promise.resolve({ data: [] })
        ]);

        const drivers = driversResult.data || [];
        const companies = companiesResult.data || [];

        // Fetch profiles
        const userIds = drivers.map(d => d.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, profile_photo_url")
          .in("id", userIds);

        const enrichedCourses = data.map(c => ({
          ...c,
          driver: {
            ...drivers.find(d => d.id === c.driver_id),
            profile: profiles?.find(p => p.id === drivers.find(d => d.id === c.driver_id)?.user_id)
          },
          company: companies.find(comp => comp.id === c.company_id)
        }));

        setCourses(enrichedCourses as CompanyCourse[]);
      } else {
        setCourses([]);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveCompanyPayment = async () => {
    if (!receivePaymentDialog || !paymentAmount) return;
    
    setProcessingId(receivePaymentDialog.id);
    try {
      const { data, error } = await supabase.rpc("fleet_receive_company_payment", {
        p_course_id: receivePaymentDialog.course_id,
        p_amount: parseFloat(paymentAmount),
        p_payment_method: paymentMethod
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string; error?: string };
      if (result.success) {
        toast.success(result.message || "Paiement enregistré");
        setReceivePaymentDialog(null);
        setPaymentAmount("");
        fetchCourses();
      } else {
        toast.error(result.error || "Erreur");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (course: CompanyCourse) => {
    if (course.status === "completed") {
      if (course.payment_handled_by === "driver") {
        if (course.payment_declared_by_driver) {
          if (course.driver_commission_paid_to_fleet) {
            return <Badge className="bg-success">Commission reçue</Badge>;
          }
          return <Badge variant="outline" className="border-warning text-warning">Commission à percevoir</Badge>;
        }
        return <Badge variant="outline" className="border-info text-info">Attente déclaration</Badge>;
      } else if (course.payment_handled_by === "fleet_manager") {
        if (course.fleet_to_driver_payment_sent) {
          return <Badge className="bg-success">Payé au chauffeur</Badge>;
        }
        if (course.fleet_to_driver_payment_pending) {
          return <Badge variant="outline" className="border-warning text-warning">À payer au chauffeur</Badge>;
        }
      }
      return <Badge variant="secondary">Terminée</Badge>;
    }
    return <Badge variant="outline">{course.status}</Badge>;
  };

  // Filter courses by tab
  const pendingPaymentCourses = courses.filter(c => 
    c.status === "completed" && 
    (
      (c.payment_handled_by === "fleet_manager" && !c.fleet_to_driver_payment_sent) ||
      (c.payment_handled_by === "driver" && c.payment_declared_by_driver && !c.driver_commission_paid_to_fleet) ||
      !c.payment_handled_by
    )
  );

  const paidCourses = courses.filter(c =>
    c.status === "completed" &&
    (
      (c.payment_handled_by === "fleet_manager" && c.fleet_to_driver_payment_sent) ||
      (c.payment_handled_by === "driver" && c.driver_commission_paid_to_fleet)
    )
  );

  const inProgressCourses = courses.filter(c => c.status !== "completed");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Explications */}
      <Alert className="border-info/50 bg-info/10">
        <Info className="h-4 w-4" />
        <AlertTitle>Gestion des courses entreprises</AlertTitle>
        <AlertDescription className="space-y-2 mt-2">
          <p><strong>Paiement sur place :</strong> Le chauffeur encaisse et vous doit une commission.</p>
          <p><strong>Paiement indirect :</strong> L'entreprise vous paie, vous prélevez votre commission et reversez au chauffeur.</p>
        </AlertDescription>
      </Alert>

      {/* Résumé */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-warning/20">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold">{pendingPaymentCourses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-info/10 to-info/5 border-info/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-info/20">
                <Car className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En cours</p>
                <p className="text-2xl font-bold">{inProgressCourses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-success/20">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Réglées</p>
                <p className="text-2xl font-bold">{paidCourses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending_payment" className="gap-1">
            <Clock className="w-4 h-4" />
            En attente ({pendingPaymentCourses.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="gap-1">
            <Car className="w-4 h-4" />
            En cours ({inProgressCourses.length})
          </TabsTrigger>
          <TabsTrigger value="paid" className="gap-1">
            <CheckCircle className="w-4 h-4" />
            Réglées ({paidCourses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending_payment" className="space-y-4">
          {pendingPaymentCourses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">Aucune course en attente de règlement</p>
              </CardContent>
            </Card>
          ) : (
            pendingPaymentCourses.map((course) => (
              <Card key={course.id} className="hover:border-primary/30 transition-all">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={course.company?.logo_url || undefined} />
                      <AvatarFallback className="bg-primary/10">
                        <Building2 className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{course.company?.company_name || "Entreprise"}</h4>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {course.driver?.profile?.full_name || "Chauffeur"}
                          </p>
                        </div>
                        {getStatusBadge(course)}
                      </div>

                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-success" />
                          <span className="truncate">{course.course?.pickup_address}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-destructive" />
                          <span className="truncate">{course.course?.destination_address}</span>
                        </div>
                      </div>

                      {course.course_amount && (
                        <div className="flex items-center gap-4 p-2 bg-muted/30 rounded-lg text-sm">
                          <div>
                            <span className="text-muted-foreground">Total : </span>
                            <span className="font-semibold">{course.course_amount.toFixed(2)} €</span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <span className="text-muted-foreground">Commission : </span>
                            <span className="font-semibold text-primary">{(course.commission_amount || 0).toFixed(2)} €</span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <span className="text-muted-foreground">Chauffeur : </span>
                            <span className="font-semibold text-success">{(course.earnings_for_driver || 0).toFixed(2)} €</span>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        {!course.payment_handled_by && (
                          <Dialog open={receivePaymentDialog?.id === course.id} onOpenChange={(open) => !open && setReceivePaymentDialog(null)}>
                            <DialogTrigger asChild>
                              <Button size="sm" onClick={() => setReceivePaymentDialog(course)} className="gap-1">
                                <Euro className="w-3 h-3" />
                                Enregistrer paiement
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Enregistrer le paiement de l'entreprise</DialogTitle>
                                <DialogDescription>
                                  Indiquez le montant reçu de {course.company?.company_name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Montant reçu (€)</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    placeholder="0.00"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Mode de paiement</Label>
                                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="transfer">Virement</SelectItem>
                                      <SelectItem value="check">Chèque</SelectItem>
                                      <SelectItem value="cash">Espèces</SelectItem>
                                      <SelectItem value="card">Carte</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {paymentAmount && (
                                  <Alert>
                                    <AlertDescription>
                                      <div className="space-y-1">
                                        <p>Commission ({course.commission_percentage || 0}%) : <strong>{(parseFloat(paymentAmount) * (course.commission_percentage || 0) / 100).toFixed(2)} €</strong></p>
                                        <p>À reverser au chauffeur : <strong className="text-success">{(parseFloat(paymentAmount) - (parseFloat(paymentAmount) * (course.commission_percentage || 0) / 100)).toFixed(2)} €</strong></p>
                                      </div>
                                    </AlertDescription>
                                  </Alert>
                                )}
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setReceivePaymentDialog(null)}>
                                  Annuler
                                </Button>
                                <Button 
                                  onClick={handleReceiveCompanyPayment}
                                  disabled={!paymentAmount || processingId === course.id}
                                >
                                  {processingId === course.id && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                  Confirmer
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}

                        {course.payment_handled_by === "fleet_manager" && !course.fleet_to_driver_payment_sent && (
                          <Button size="sm" className="gap-1 bg-success hover:bg-success/90">
                            <Send className="w-3 h-3" />
                            Payer le chauffeur ({(course.earnings_for_driver || 0).toFixed(2)} €)
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="in_progress" className="space-y-4">
          {inProgressCourses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Car className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">Aucune course en cours</p>
              </CardContent>
            </Card>
          ) : (
            inProgressCourses.map((course) => (
              <Card key={course.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={course.driver?.profile?.profile_photo_url || undefined} />
                        <AvatarFallback>{(course.driver?.profile?.full_name || "C")[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{course.driver?.profile?.full_name}</p>
                        <p className="text-sm text-muted-foreground">{course.company?.company_name}</p>
                      </div>
                    </div>
                    <Badge>{course.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="paid" className="space-y-4">
          {paidCourses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground">Aucune course réglée</p>
              </CardContent>
            </Card>
          ) : (
            paidCourses.map((course) => (
              <Card key={course.id} className="border-success/20 bg-success/5">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={course.driver?.profile?.profile_photo_url || undefined} />
                        <AvatarFallback>{(course.driver?.profile?.full_name || "C")[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{course.driver?.profile?.full_name}</p>
                        <p className="text-sm text-muted-foreground">{course.company?.company_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-success">{(course.course_amount || 0).toFixed(2)} €</p>
                      <p className="text-xs text-muted-foreground">
                        Commission: {(course.commission_amount || 0).toFixed(2)} €
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={fetchCourses} className="gap-1">
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </Button>
      </div>
    </div>
  );
};
