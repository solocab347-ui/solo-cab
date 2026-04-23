import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Building2,
  Euro,
  Loader2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Wallet,
  Car,
  MapPin,
  Info,
  CreditCard,
  Send,
  Check
} from "lucide-react";

interface DriverDeclareFleetCoursePaymentProps {
  driverId: string;
}

interface FleetCourse {
  id: string;
  course_id: string;
  fleet_manager_id: string;
  partnership_id: string;
  company_id: string | null;
  course_amount: number | null;
  commission_percentage: number | null;
  commission_amount: number | null;
  earnings_for_driver: number | null;
  payment_handled_by: string | null;
  payment_declared_by_driver: boolean;
  payment_declared_at: string | null;
  driver_commission_to_fleet: number | null;
  driver_commission_paid_to_fleet: boolean;
  fleet_to_driver_payment_pending: number | null;
  fleet_to_driver_payment_sent: boolean;
  fleet_to_driver_payment_confirmed: boolean;
  status: string;
  created_at: string;
  completed_at: string | null;
  course?: {
    pickup_address: string;
    destination_address: string;
    scheduled_date: string;
    status: string;
  };
  fleet_manager?: {
    id: string;
    company_name: string;
    logo_url: string | null;
  };
  company?: {
    company_name: string;
    logo_url: string | null;
  };
}

export const DriverDeclareFleetCoursePayment = ({ driverId }: DriverDeclareFleetCoursePaymentProps) => {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<FleetCourse[]>([]);
  const [declaring, setDeclaring] = useState<string | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState<string | null>(null);
  const [declareDialog, setDeclareDialog] = useState<FleetCourse | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  useEffect(() => {
    fetchCourses();
  }, [driverId]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("fleet_partner_courses")
        .select(`
          id,
          course_id,
          fleet_manager_id,
          partnership_id,
          company_id,
          course_amount,
          commission_percentage,
          commission_amount,
          earnings_for_driver,
          payment_handled_by,
          payment_declared_by_driver,
          payment_declared_at,
          driver_commission_to_fleet,
          driver_commission_paid_to_fleet,
          fleet_to_driver_payment_pending,
          fleet_to_driver_payment_sent,
          fleet_to_driver_payment_confirmed,
          status,
          created_at,
          completed_at,
          course:courses(
            pickup_address,
            destination_address,
            scheduled_date,
            status
          ),
          fleet_manager:fleet_managers(
            id,
            company_name,
            logo_url
          )
        `)
        .eq("driver_id", driverId)
        .in("status", ["completed", "accepted", "in_progress"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch company info if needed
      if (data && data.length > 0) {
        const companyIds = [...new Set(data.map(c => c.company_id).filter(Boolean))];
        
        if (companyIds.length > 0) {
          const { data: companies } = await supabase
            .from("companies")
            .select("id, company_name, logo_url")
            .in("id", companyIds as string[]);

          const enrichedCourses = data.map(c => ({
            ...c,
            company: companies?.find(comp => comp.id === c.company_id)
          }));

          setCourses(enrichedCourses as FleetCourse[]);
        } else {
          setCourses(data as FleetCourse[]);
        }
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

  const handleDeclarePayment = async () => {
    if (!declareDialog) return;

    setDeclaring(declareDialog.id);
    try {
      const { data, error } = await supabase.rpc("declare_fleet_course_payment_on_site", {
        p_course_id: declareDialog.course_id,
        p_payment_method: paymentMethod
      });

      if (error) throw error;

      const result = data as { success: boolean; commission_amount?: number; message?: string; error?: string };
      
      if (result.success) {
        toast.success(`Paiement déclaré ! Frais de transaction à reverser : ${result.commission_amount?.toFixed(2)} €`);
        setDeclareDialog(null);
        fetchCourses();
      } else {
        toast.error(result.error || "Erreur");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erreur lors de la déclaration");
    } finally {
      setDeclaring(null);
    }
  };

  const handleConfirmPaymentReceived = async (courseId: string) => {
    setConfirmingPayment(courseId);
    try {
      // Find the payment to confirm
      const course = courses.find(c => c.course_id === courseId);
      if (!course) return;

      // Get the payment record
      const { data: payments, error: fetchError } = await supabase
        .from("fleet_driver_indirect_payments")
        .select("id")
        .eq("driver_id", driverId)
        .contains("course_ids", [courseId])
        .eq("status", "sent")
        .limit(1);

      if (fetchError) throw fetchError;

      if (payments && payments.length > 0) {
        const { data, error } = await supabase.rpc("driver_confirm_fleet_payment", {
          p_payment_id: payments[0].id
        });

        if (error) throw error;

        const result = data as { success: boolean; message?: string };
        if (result.success) {
          toast.success("Paiement confirmé !");
          fetchCourses();
        }
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erreur lors de la confirmation");
    } finally {
      setConfirmingPayment(null);
    }
  };

  // Filter courses
  const needsDeclaration = courses.filter(c => 
    c.status === "completed" && 
    !c.payment_declared_by_driver && 
    c.payment_handled_by !== "fleet_manager"
  );

  const awaitingFleetPayment = courses.filter(c =>
    c.status === "completed" &&
    c.payment_handled_by === "fleet_manager" &&
    c.fleet_to_driver_payment_sent &&
    !c.fleet_to_driver_payment_confirmed
  );

  const commissionsDue = courses.filter(c =>
    c.status === "completed" &&
    c.payment_declared_by_driver &&
    !c.driver_commission_paid_to_fleet
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert className="border-info/50 bg-info/10">
        <Info className="h-4 w-4" />
        <AlertTitle>Gestion des paiements de flotte</AlertTitle>
        <AlertDescription className="space-y-2 mt-2">
          <p><strong>Paiement sur place :</strong> Déclarez le paiement reçu et reversez la commission au gestionnaire.</p>
          <p><strong>Paiement via gestionnaire :</strong> Confirmez la réception du versement du gestionnaire.</p>
        </AlertDescription>
      </Alert>

      {/* Résumé */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-warning/20">
                <CreditCard className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">À déclarer</p>
                <p className="text-2xl font-bold">{needsDeclaration.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-info/10 to-info/5 border-info/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-info/20">
                <Clock className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paiements à confirmer</p>
                <p className="text-2xl font-bold">{awaitingFleetPayment.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/20">
                <Euro className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Commissions dues</p>
                <p className="text-2xl font-bold">
                  {commissionsDue.reduce((sum, c) => sum + (c.driver_commission_to_fleet || 0), 0).toFixed(2)} €
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Courses à déclarer */}
      {needsDeclaration.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <CreditCard className="w-5 h-5" />
              Courses à déclarer
            </CardTitle>
            <CardDescription>
              Déclarez les paiements reçus sur place pour ces courses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {needsDeclaration.map((course) => (
              <Card key={course.id} className="border-warning/20 hover:border-warning/40 transition-all">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={course.fleet_manager?.logo_url || undefined} />
                      <AvatarFallback className="bg-primary/10">
                        <Building2 className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{course.fleet_manager?.company_name}</h4>
                          {course.company && (
                            <p className="text-sm text-muted-foreground">
                              Client: {course.company.company_name}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="border-warning text-warning">
                          À déclarer
                        </Badge>
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
                        <div className="flex items-center gap-4 text-sm p-2 bg-muted/30 rounded">
                          <span>Montant: <strong>{course.course_amount.toFixed(2)} €</strong></span>
                          <span className="text-muted-foreground">|</span>
                          <span>Rétribution: <strong className="text-primary">{(course.commission_amount || 0).toFixed(2)} €</strong></span>
                        </div>
                      )}

                      <Dialog open={declareDialog?.id === course.id} onOpenChange={(open) => !open && setDeclareDialog(null)}>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            onClick={() => setDeclareDialog(course)}
                            className="gap-1 mt-2"
                          >
                            <Euro className="w-3 h-3" />
                            Déclarer le paiement
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Déclarer le paiement reçu</DialogTitle>
                            <DialogDescription>
                              Confirmez que le client a payé directement sur place
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Mode de paiement reçu</Label>
                              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cash">Espèces</SelectItem>
                                  <SelectItem value="card">Carte bancaire</SelectItem>
                                  <SelectItem value="company_card">Carte entreprise</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <Alert>
                              <Euro className="h-4 w-4" />
                              <AlertDescription>
                                <p className="font-medium">Commission à reverser au gestionnaire :</p>
                                <p className="text-2xl font-bold text-primary mt-1">
                                  {((course.course_amount || 0) * (course.commission_percentage || 0) / 100).toFixed(2)} €
                                </p>
                              </AlertDescription>
                            </Alert>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setDeclareDialog(null)}>
                              Annuler
                            </Button>
                            <Button onClick={handleDeclarePayment} disabled={declaring === course.id}>
                              {declaring === course.id && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                              Confirmer
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Paiements à confirmer */}
      {awaitingFleetPayment.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-info">
              <Wallet className="w-5 h-5" />
              Paiements à confirmer
            </CardTitle>
            <CardDescription>
              Le gestionnaire vous a envoyé ces paiements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {awaitingFleetPayment.map((course) => (
              <Card key={course.id} className="border-info/20 hover:border-info/40 transition-all">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={course.fleet_manager?.logo_url || undefined} />
                        <AvatarFallback><Building2 className="w-4 h-4" /></AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{course.fleet_manager?.company_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Montant: {(course.earnings_for_driver || 0).toFixed(2)} €
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleConfirmPaymentReceived(course.course_id)}
                      disabled={confirmingPayment === course.course_id}
                      className="gap-1 bg-success hover:bg-success/90"
                    >
                      {confirmingPayment === course.course_id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      Confirmer réception
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Commissions dues */}
      {commissionsDue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="w-5 h-5 text-primary" />
              Commissions à reverser
            </CardTitle>
            <CardDescription>
              Ces commissions doivent être reversées à vos gestionnaires
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {commissionsDue.map((course) => (
              <div key={course.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={course.fleet_manager?.logo_url || undefined} />
                    <AvatarFallback><Building2 className="w-4 h-4" /></AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{course.fleet_manager?.company_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {course.course?.scheduled_date && format(new Date(course.course.scheduled_date), "dd MMM yyyy", { locale: fr })}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="border-primary text-primary text-lg px-3 py-1">
                  {(course.driver_commission_to_fleet || 0).toFixed(2)} €
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {needsDeclaration.length === 0 && awaitingFleetPayment.length === 0 && commissionsDue.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-success/30" />
            <p className="text-muted-foreground">Aucune action requise</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tous vos paiements sont à jour
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
