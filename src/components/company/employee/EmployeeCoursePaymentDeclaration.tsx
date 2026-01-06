import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Car, 
  Loader2, 
  MapPin, 
  Euro,
  CheckCircle2,
  Building2,
  User,
  Calendar,
  ArrowRight,
  AlertCircle,
  Banknote,
  Receipt,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

interface CompletedCourse {
  id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  amount: number | null;
  driver_name: string | null;
  company_course_id: string;
  // Driver's declaration
  driver_declared_paid: boolean; // true = paid_on_spot, false = company_will_pay
  company_payment_status: string | null;
}

interface EmployeeCoursePaymentDeclarationProps {
  employeeId: string;
  companyId: string;
  onExpenseCreated?: () => void;
}

export function EmployeeCoursePaymentDeclaration({ 
  employeeId, 
  companyId,
  onExpenseCreated 
}: EmployeeCoursePaymentDeclarationProps) {
  const [courses, setCourses] = useState<CompletedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<CompletedCourse | null>(null);
  const [declaring, setDeclaring] = useState(false);

  useEffect(() => {
    fetchUnconfirmedCourses();
  }, [employeeId]);

  const fetchUnconfirmedCourses = async () => {
    try {
      // Récupérer les courses terminées sans confirmation du collaborateur
      const { data: companyCourses, error } = await supabase
        .from("company_courses")
        .select(`
          id,
          actual_payment_method,
          client_confirmed_payment_method,
          course:courses!inner(
            id,
            pickup_address,
            destination_address,
            scheduled_date,
            status,
            driver_id,
            company_payment_status,
            driver_declared_payment_received
          )
        `)
        .eq("employee_id", employeeId)
        .is("client_confirmed_payment_method", null);

      if (error) throw error;

      const enrichedCourses: CompletedCourse[] = [];

      for (const cc of companyCourses || []) {
        const course = cc.course as any;
        
        // Ne prendre que les courses terminées
        if (course.status !== "completed") continue;

        let driverName = null;
        let amount = null;

        // Récupérer le nom du chauffeur
        if (course.driver_id) {
          const { data: driver } = await supabase
            .from("drivers")
            .select("user_id")
            .eq("id", course.driver_id)
            .maybeSingle();
          
          if (driver?.user_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", driver.user_id)
              .maybeSingle();
            driverName = profile?.full_name || null;
          }
        }

        // Récupérer le montant du devis accepté
        const { data: devis } = await supabase
          .from("devis")
          .select("amount")
          .eq("course_id", course.id)
          .eq("status", "accepted")
          .maybeSingle();
        
        amount = devis?.amount || null;

        // Déterminer ce que le chauffeur a déclaré
        const driverDeclaredPaid = course.driver_declared_payment_received === true ||
          course.company_payment_status === "paid_on_spot";

        enrichedCourses.push({
          id: course.id,
          pickup_address: course.pickup_address,
          destination_address: course.destination_address,
          scheduled_date: course.scheduled_date,
          amount,
          driver_name: driverName,
          company_course_id: cc.id,
          driver_declared_paid: driverDeclaredPaid,
          company_payment_status: course.company_payment_status,
        });
      }

      setCourses(enrichedCourses);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async (confirmedPaidByEmployee: boolean) => {
    if (!selectedCourse) return;

    setDeclaring(true);
    try {
      const paymentMethod = confirmedPaidByEmployee ? "paid_on_spot" : "company_will_pay";

      // Mettre à jour company_courses avec la confirmation du collaborateur
      const { error: updateError } = await supabase
        .from("company_courses")
        .update({
          actual_payment_method: confirmedPaidByEmployee ? "employee_personal" : "company_account",
          client_confirmed_payment_method: paymentMethod,
          client_confirmed_at: new Date().toISOString(),
          payment_declared_at: new Date().toISOString(),
        })
        .eq("id", selectedCourse.company_course_id);

      if (updateError) throw updateError;

      // Mettre à jour courses.client_payment_confirmation
      await supabase
        .from("courses")
        .update({
          client_payment_confirmation: paymentMethod,
          client_payment_confirmation_at: new Date().toISOString(),
          company_payment_status: paymentMethod,
        })
        .eq("id", selectedCourse.id);

      // Si le collaborateur confirme avoir payé
      if (confirmedPaidByEmployee) {
        // Mettre la facture en "paid"
        await supabase
          .from("factures")
          .update({
            payment_status: "paid",
            paid_at: new Date().toISOString()
          })
          .eq("course_id", selectedCourse.id);

        // Créer automatiquement une note de frais
        if (selectedCourse.amount) {
          const { error: expenseError } = await supabase
            .from("expense_reports")
            .insert({
              company_id: companyId,
              employee_id: employeeId,
              course_id: selectedCourse.id,
              amount: selectedCourse.amount,
              description: `Course VTC - ${selectedCourse.pickup_address.split(",")[0]} → ${selectedCourse.destination_address.split(",")[0]}`,
              payment_method: "card",
              status: "pending",
              submitted_at: new Date().toISOString(),
            } as any);

          if (expenseError) {
            console.error("Expense error:", expenseError);
          }

          toast.success("Note de frais créée !", {
            description: `${selectedCourse.amount.toFixed(2)} € en attente de remboursement`
          });
          
          onExpenseCreated?.();
        }
      } else {
        // Payé par l'entreprise - facture reste en attente
        toast.success("Confirmation enregistrée", {
          description: "Cette course sera facturée à l'entreprise"
        });
      }

      setSelectedCourse(null);
      fetchUnconfirmedCourses();
    } catch (error) {
      console.error("Error declaring payment:", error);
      toast.error("Erreur lors de la confirmation");
    } finally {
      setDeclaring(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (courses.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-900/10 shadow-lg overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Car className="w-5 h-5" />
            Courses à confirmer ({courses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Confirmez le mode de paiement de ces courses. Une note de frais sera créée automatiquement si vous avez payé personnellement.
          </p>
          <div className="space-y-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="p-4 rounded-xl bg-white/80 dark:bg-black/30 border border-amber-200/50 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedCourse(course)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Driver's declaration badge */}
                    <div className="mb-2">
                      {course.driver_declared_paid ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400">
                          <Banknote className="w-3 h-3 mr-1" />
                          Chauffeur: payé sur place
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400">
                          <Building2 className="w-3 h-3 mr-1" />
                          Chauffeur: à facturer entreprise
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(course.scheduled_date), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                      <span className="truncate">{course.pickup_address.split(",")[0]}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{course.destination_address.split(",")[0]}</span>
                    </div>
                    {course.driver_name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Chauffeur: {course.driver_name}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    {course.amount && (
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        {course.amount.toFixed(2)} €
                      </Badge>
                    )}
                    <Button size="sm" variant="outline" className="text-xs">
                      Confirmer
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmation */}
      <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Confirmer le paiement
            </DialogTitle>
            <DialogDescription>
              Vérifiez la déclaration du chauffeur et confirmez.
            </DialogDescription>
          </DialogHeader>

          {selectedCourse && (
            <>
              {/* Course details */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(selectedCourse.scheduled_date), "EEEE dd MMMM yyyy", { locale: fr })}
                </div>
                <p className="font-medium">
                  {selectedCourse.pickup_address.split(",")[0]} → {selectedCourse.destination_address.split(",")[0]}
                </p>
                {selectedCourse.driver_name && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Chauffeur: {selectedCourse.driver_name}
                  </p>
                )}
                {selectedCourse.amount && (
                  <p className="text-xl font-bold text-primary mt-2">
                    {selectedCourse.amount.toFixed(2)} €
                  </p>
                )}
              </div>

              {/* Driver's declaration */}
              <div className={`p-4 rounded-xl border-2 ${
                selectedCourse.driver_declared_paid 
                  ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800"
                  : "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className={`w-4 h-4 ${selectedCourse.driver_declared_paid ? "text-emerald-600" : "text-blue-600"}`} />
                  <span className="font-semibold text-sm">
                    Déclaration du chauffeur
                  </span>
                </div>
                <p className={`text-sm ${selectedCourse.driver_declared_paid ? "text-emerald-700 dark:text-emerald-400" : "text-blue-700 dark:text-blue-400"}`}>
                  {selectedCourse.driver_declared_paid 
                    ? "Le passager a réglé la course sur place"
                    : "La course sera facturée à l'entreprise"
                  }
                </p>
              </div>

              {/* Confirmation buttons */}
              <div className="space-y-3 mt-2">
                <p className="text-sm font-medium text-center">Confirmez-vous cette information ?</p>
                
                {selectedCourse.driver_declared_paid ? (
                  // Driver said paid on spot - employee confirms
                  <div className="grid grid-cols-1 gap-3">
                    <Button
                      className="flex items-center justify-center gap-2 h-auto py-4 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleConfirmPayment(true)}
                      disabled={declaring}
                    >
                      {declaring ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          <div className="text-left">
                            <span className="block font-semibold">Oui, j'ai payé</span>
                            <span className="text-xs opacity-80">Créer une note de frais</span>
                          </div>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex items-center justify-center gap-2 h-auto py-4"
                      onClick={() => handleConfirmPayment(false)}
                      disabled={declaring}
                    >
                      <Building2 className="w-5 h-5" />
                      <div className="text-left">
                        <span className="block font-semibold">Non, facturer l'entreprise</span>
                        <span className="text-xs text-muted-foreground">Corriger la déclaration</span>
                      </div>
                    </Button>
                  </div>
                ) : (
                  // Driver said company will pay - employee confirms
                  <div className="grid grid-cols-1 gap-3">
                    <Button
                      className="flex items-center justify-center gap-2 h-auto py-4 bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleConfirmPayment(false)}
                      disabled={declaring}
                    >
                      {declaring ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Building2 className="w-5 h-5" />
                          <div className="text-left">
                            <span className="block font-semibold">Confirmer: facturer l'entreprise</span>
                            <span className="text-xs opacity-80">Paiement différé</span>
                          </div>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex items-center justify-center gap-2 h-auto py-4"
                      onClick={() => handleConfirmPayment(true)}
                      disabled={declaring}
                    >
                      <User className="w-5 h-5" />
                      <div className="text-left">
                        <span className="block font-semibold">J'ai payé personnellement</span>
                        <span className="text-xs text-muted-foreground">Créer une note de frais</span>
                      </div>
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setSelectedCourse(null)}
              disabled={declaring}
            >
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
