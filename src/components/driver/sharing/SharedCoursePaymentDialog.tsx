import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  CreditCard, 
  Loader2, 
  CheckCircle2, 
  ArrowRight,
  Euro,
  User,
  MapPin,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SharedCoursePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sharedCourse: {
    id: string;
    course_id: string;
    course_amount: number;
    commission_percentage: number;
    commission_amount: number;
    course?: {
      pickup_address: string;
      destination_address: string;
      scheduled_date: string;
      clients?: {
        profiles?: {
          full_name?: string;
        };
      };
    };
    sender_driver?: {
      profiles?: {
        full_name?: string;
      };
    };
  };
  onSuccess: () => void;
}

export function SharedCoursePaymentDialog({
  open,
  onOpenChange,
  sharedCourse,
  onSuccess,
}: SharedCoursePaymentDialogProps) {
  const [loading, setLoading] = useState(false);

  const receiverKeeps = sharedCourse.course_amount - sharedCourse.commission_amount;

  const handleCreatePayment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-shared-course-payment', {
        body: { shared_course_id: sharedCourse.id },
      });

      if (error) throw error;

      if (data?.checkout_url) {
        // Open Stripe checkout in new tab
        window.open(data.checkout_url, '_blank');
        toast.info('Page de paiement ouverte. Le client doit compléter le paiement.');
        onOpenChange(false);
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error creating payment:', error);
      toast.error(error.message || 'Erreur lors de la création du paiement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Encaisser le paiement
          </DialogTitle>
          <DialogDescription>
            Générez le lien de paiement pour le client
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Course Info */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            {sharedCourse.course?.clients?.profiles?.full_name && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{sharedCourse.course.clients.profiles.full_name}</span>
              </div>
            )}
            
            {sharedCourse.course?.scheduled_date && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(sharedCourse.course.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}</span>
              </div>
            )}
            
            {sharedCourse.course?.pickup_address && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="truncate">{sharedCourse.course.pickup_address}</p>
                  <p className="truncate">→ {sharedCourse.course.destination_address}</p>
                </div>
              </div>
            )}
          </div>

          {/* Payment Breakdown */}
          <div className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Montant total</span>
              <span className="font-bold text-lg">{sharedCourse.course_amount.toFixed(2)}€</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Rétribution partenaire ({sharedCourse.commission_percentage}%)</span>
              <span className="text-amber-500">-{sharedCourse.commission_amount.toFixed(2)}€</span>
            </div>
            
            <div className="pt-2 border-t border-green-500/20 flex items-center justify-between">
              <span className="font-medium">Vous gardez</span>
              <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-base px-3 py-1">
                <Euro className="h-4 w-4 mr-1" />
                {receiverKeeps.toFixed(2)}€
              </Badge>
            </div>
          </div>

          {/* Partner Info */}
          {sharedCourse.sender_driver?.profiles?.full_name && (
            <Alert className="border-indigo-500/30 bg-indigo-500/10">
              <CheckCircle2 className="h-4 w-4 text-indigo-500" />
              <AlertTitle className="text-indigo-400">Rétribution partenaire</AlertTitle>
              <AlertDescription className="text-sm text-muted-foreground">
                {sharedCourse.commission_amount.toFixed(2)}€ seront automatiquement transférés à {sharedCourse.sender_driver.profiles.full_name} après le paiement.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button 
            onClick={handleCreatePayment}
            disabled={loading}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            Générer le lien de paiement
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
