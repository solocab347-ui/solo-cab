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
    fetchUnpaidCourses();
  }, [employeeId]);

  const fetchUnpaidCourses = async () => {
    try {
      // Récupérer les courses terminées qui n'ont pas encore de déclaration de paiement
      const { data: companyCourses, error } = await supabase
        .from("company_courses")
        .select(`
          id,
          course:courses!inner(
            id,
            pickup_address,
            destination_address,
            scheduled_date,
            status,
            driver_id
          )
        `)
        .eq("employee_id", employeeId)
        .is("actual_payment_method", null); // Pas encore déclaré

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

        enrichedCourses.push({
          id: course.id,
          pickup_address: course.pickup_address,
          destination_address: course.destination_address,
          scheduled_date: course.scheduled_date,
          amount,
          driver_name: driverName,
          company_course_id: cc.id,
        });
      }

      setCourses(enrichedCourses);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeclarePayment = async (paymentBy: "company" | "employee") => {
    if (!selectedCourse) return;

    setDeclaring(true);
    try {
      // Mettre à jour la course avec le mode de paiement
      const { error: updateError } = await supabase
        .from("company_courses")
        .update({
          actual_payment_method: paymentBy === "company" ? "company_account" : "employee_personal",
          payment_declared_at: new Date().toISOString(),
        })
        .eq("id", selectedCourse.company_course_id);

      if (updateError) throw updateError;

      // Si payé par l'employé, créer automatiquement une note de frais
      if (paymentBy === "employee" && selectedCourse.amount) {
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

        if (expenseError) throw expenseError;

        toast.success("Note de frais créée automatiquement !", {
          description: `${selectedCourse.amount.toFixed(2)} € en attente de validation`
        });
        
        onExpenseCreated?.();
      } else {
        toast.success("Paiement déclaré !", {
          description: "La course a été marquée comme réglée par l'entreprise"
        });
      }

      setSelectedCourse(null);
      fetchUnpaidCourses();
    } catch (error) {
      console.error("Error declaring payment:", error);
      toast.error("Erreur lors de la déclaration");
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
    return null; // Ne rien afficher s'il n'y a pas de courses à déclarer
  }

  return (
    <>
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-900/10 shadow-lg overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Car className="w-5 h-5" />
            Courses à déclarer ({courses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Indiquez qui a réglé ces courses. Si vous avez payé personnellement, une note de frais sera créée automatiquement.
          </p>
          <div className="space-y-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="p-4 rounded-xl bg-white/50 dark:bg-black/20 border border-amber-200/50 hover:border-amber-300 transition-all cursor-pointer"
                onClick={() => setSelectedCourse(course)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(course.scheduled_date), "dd MMM yyyy à HH:mm", { locale: fr })}
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
                  <div className="text-right">
                    {course.amount && (
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        {course.amount.toFixed(2)} €
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de déclaration */}
      <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Euro className="w-5 h-5 text-primary" />
              Qui a réglé cette course ?
            </DialogTitle>
            <DialogDescription>
              Cette information permet de gérer correctement les notes de frais.
            </DialogDescription>
          </DialogHeader>

          {selectedCourse && (
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 my-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Calendar className="w-3 h-3" />
                {format(new Date(selectedCourse.scheduled_date), "dd MMMM yyyy", { locale: fr })}
              </div>
              <p className="font-medium">
                {selectedCourse.pickup_address.split(",")[0]} → {selectedCourse.destination_address.split(",")[0]}
              </p>
              {selectedCourse.amount && (
                <p className="text-lg font-bold text-primary mt-2">
                  {selectedCourse.amount.toFixed(2)} €
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-6 border-2 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
              onClick={() => handleDeclarePayment("company")}
              disabled={declaring}
            >
              {declaring ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <>
                  <Building2 className="w-8 h-8 text-emerald-600" />
                  <span className="font-semibold">Réglée par l'entreprise</span>
                  <span className="text-xs text-muted-foreground">Paiement société</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-6 border-2 hover:border-primary hover:bg-primary/5"
              onClick={() => handleDeclarePayment("employee")}
              disabled={declaring}
            >
              {declaring ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <>
                  <User className="w-8 h-8 text-primary" />
                  <span className="font-semibold">Réglée par moi</span>
                  <span className="text-xs text-muted-foreground">Génère une note de frais</span>
                </>
              )}
            </Button>
          </div>

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
