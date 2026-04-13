import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { checkDriverStripeStatus } from "@/hooks/useDriverStripeStatus";
import { toast } from "sonner";
import { FileText, MapPin, Calendar, Users, CheckCircle2, Clock, Euro, AlertTriangle, Loader2, CreditCard, ShieldCheck } from "lucide-react";

const QuoteAcceptance = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [devis, setDevis] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);
  const [driverHasStripe, setDriverHasStripe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);

  useEffect(() => {
    if (token) loadQuote();
  }, [token]);

  // Handle return from Stripe Checkout
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    if (paymentStatus === "success") {
      setAccepted(true);
      toast.success("Paiement validé ! Votre course est confirmée.");
    } else if (paymentStatus === "cancelled") {
      toast.error("Paiement annulé. Vous pouvez réessayer.");
    }
  }, [searchParams]);

  const loadQuote = async () => {
    try {
      const { data: devisData, error: devisError } = await supabase
        .from('devis')
        .select('*')
        .eq('quote_token', token)
        .single();

      if (devisError || !devisData) {
        setError("Devis introuvable ou lien invalide");
        setLoading(false);
        return;
      }

      setDevis(devisData);

      const status = devisData.status as string;
      
      // Check if already accepted or paid
      if (['accepted', 'deposit_paid', 'bank_imprint'].includes(status)) {
        setAccepted(true);
      }

      // Check if payment is pending (redirect to Stripe happened)
      if (status === 'payment_pending') {
        setPaymentPending(true);
      }

      // Check expiry
      if (new Date(devisData.valid_until) < new Date() && !['accepted', 'deposit_paid', 'bank_imprint'].includes(status)) {
        setError("Ce devis a expiré");
        setLoading(false);
        return;
      }

      // Fetch course
      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', devisData.course_id)
        .single();

      if (courseData) setCourse(courseData);

      // Fetch driver info including Stripe Connect status
      const { data: driverData } = await supabase
        .from('drivers')
        .select('id, license_number, max_passengers, vehicle_brand, vehicle_model, vehicle_color')
        .eq('id', devisData.driver_id)
        .single();

      if (driverData) {
        const hasStripe = await checkDriverStripeStatus(devisData.driver_id);
        setDriverHasStripe(hasStripe);

        // Get driver profile name
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', (await supabase.from('drivers').select('user_id').eq('id', driverData.id).single()).data?.user_id || '')
          .single();

        setDriver({ ...driverData, ...profileData });
      }
    } catch (err) {
      console.error("Error loading quote:", err);
      setError("Erreur lors du chargement du devis");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!devis || !course) return;
    setAccepting(true);

    try {
      if (driverHasStripe) {
        // ============================================
        // STRIPE CONNECT: Empreinte bancaire OBLIGATOIRE
        // ============================================
        // Create a Stripe Checkout session with manual capture (bank imprint)
        const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-course-payment', {
          body: {
            course_id: course.id,
            devis_id: devis.id,
            capture_method: 'manual', // Hold only, capture at course completion
            client_email: course.guest_email || devis.guest_client_email,
            client_name: course.guest_name || devis.guest_client_name,
            client_user_id: course.client_id ? (await supabase.from('clients').select('user_id').eq('id', course.client_id).single()).data?.user_id : undefined,
            save_card: true, // Save for future 1-click payments
          },
        });

        if (paymentError || !paymentData?.checkout_url) {
          throw new Error(paymentData?.error || paymentError?.message || "Impossible de créer la session de paiement");
        }

        // Redirect to Stripe Checkout for card imprint
        toast.info("Redirection vers la page de paiement sécurisée...");
        window.location.href = paymentData.checkout_url;
        return; // Don't setAccepting(false) since we're redirecting

      } else {
        // ============================================
        // CHAUFFEUR SANS STRIPE: Acceptation directe (paiement en main propre)
        // ============================================
        const { error: devisUpdateError } = await supabase
          .from('devis')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
          })
          .eq('id', devis.id)
          .eq('status', 'pending');

        if (devisUpdateError) {
          throw new Error("Erreur lors de l'acceptation du devis");
        }

        // Update course status
        await supabase
          .from('courses')
          .update({ status: 'accepted' })
          .eq('id', course.id);

        // Notify driver
        try {
          await supabase.from('notifications').insert({
            user_id: (await supabase.from('drivers').select('user_id').eq('id', devis.driver_id).single()).data?.user_id,
            title: '✅ Devis accepté !',
            message: `${devis.guest_client_name || 'Un client'} a accepté votre devis ${devis.quote_number} (${devis.amount}€)`,
            type: 'course_accepted',
          });
        } catch (notifErr) {
          console.warn("Notification error:", notifErr);
        }

        setAccepted(true);
        toast.success("Devis accepté avec succès !");
      }
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'acceptation");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Chargement du devis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Devis indisponible</h1>
          <p className="text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-4">
      <div className="max-w-md mx-auto pt-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <FileText className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Devis SoloCab</h1>
          <p className="text-muted-foreground">N° {devis?.quote_number}</p>
        </div>

        {/* Driver info */}
        {driver && (
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center gap-3">
              {driver.avatar_url ? (
                <img src={driver.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              )}
              <div>
                <p className="font-semibold text-foreground">{(() => {
                  const n = driver.full_name || 'Votre chauffeur';
                  const p = n.trim().split(/\s+/);
                  return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]?.toUpperCase()}.` : n;
                })()}</p>
                {driver.vehicle_brand && (
                  <p className="text-sm text-muted-foreground">{driver.vehicle_brand} {driver.vehicle_model} {driver.vehicle_color && `· ${driver.vehicle_color}`}</p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Quote details */}
        <Card className="p-6 bg-card border-border space-y-5">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Départ</p>
                <p className="text-sm font-medium text-foreground">{course?.pickup_address}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Arrivée</p>
                <p className="text-sm font-medium text-foreground">{course?.destination_address}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm font-medium text-foreground">
                  {course?.scheduled_date && new Date(course.scheduled_date).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Heure</p>
                <p className="text-sm font-medium text-foreground">
                  {course?.scheduled_date && new Date(course.scheduled_date).toLocaleTimeString('fr-FR', {
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>

          {course?.distance_km && (
            <div className="border-t border-border pt-4 flex gap-4 text-sm text-muted-foreground">
              <span>📏 {course.distance_km.toFixed(1)} km</span>
              {course.duration_minutes && <span>⏱️ ~{Math.round(course.duration_minutes)} min</span>}
            </div>
          )}

          {/* Price */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Euro className="w-5 h-5 text-primary" />
                <span className="font-medium text-foreground">Montant TTC</span>
              </div>
              <span className="text-2xl font-bold text-primary">{devis?.amount?.toFixed(2)} €</span>
            </div>
          </div>

          {/* Validity */}
          <div className="text-xs text-muted-foreground text-center">
            Valide jusqu'au {devis?.valid_until && new Date(devis.valid_until).toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'long', year: 'numeric'
            })}
          </div>
        </Card>

        {/* Notes */}
        {devis?.notes && (
          <Card className="p-4 bg-muted/30 border-border">
            <p className="text-sm text-muted-foreground">{devis.notes}</p>
          </Card>
        )}

        {/* Action */}
        {accepted ? (
          <Card className="p-6 bg-primary/5 border-primary/20 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
            <h2 className="text-lg font-bold text-foreground">Devis accepté !</h2>
            <p className="text-sm text-muted-foreground">
              {driverHasStripe 
                ? "Votre empreinte bancaire a été validée. Votre chauffeur a été notifié et la course est confirmée."
                : "Votre chauffeur a été notifié et prendra contact avec vous pour confirmer les détails de votre course."
              }
            </p>
          </Card>
        ) : paymentPending ? (
          <Card className="p-6 bg-accent/10 border-accent/20 text-center space-y-3">
            <CreditCard className="w-12 h-12 text-accent mx-auto" />
            <h2 className="text-lg font-bold text-foreground">Paiement en attente</h2>
            <p className="text-sm text-muted-foreground">
              Une session de paiement est en cours. Si vous n'avez pas terminé, cliquez ci-dessous pour réessayer.
            </p>
            <Button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full h-12 font-semibold bg-gradient-to-r from-accent to-primary hover:opacity-90"
            >
              {accepting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Redirection...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" /> Reprendre le paiement
                </span>
              )}
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {driverHasStripe && (
              <Card className="p-4 bg-primary/5 border-primary/20">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Paiement sécurisé par carte</p>
                    <p className="text-xs text-muted-foreground">
                      Une empreinte bancaire sera prise pour sécuriser votre réservation. 
                      Le montant ne sera débité qu'à la fin de la course.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <Button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              {accepting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> 
                  {driverHasStripe ? "Redirection vers le paiement..." : "Acceptation en cours..."}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {driverHasStripe ? (
                    <>
                      <CreditCard className="w-5 h-5" /> Accepter et payer par carte
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" /> Accepter le devis
                    </>
                  )}
                </span>
              )}
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pb-8">
          <p className="text-xs text-muted-foreground">
            Propulsé par <span className="font-semibold text-primary">SoloCab</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuoteAcceptance;
