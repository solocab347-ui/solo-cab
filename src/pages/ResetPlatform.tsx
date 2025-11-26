import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function ResetPlatform() {
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-platform');

      if (error) throw error;

      if (data?.success) {
        toast.success('Plateforme réinitialisée avec succès', {
          description: `${data.stats.drivers_deleted} chauffeurs et ${data.stats.clients_deleted} clients supprimés`
        });
      } else {
        throw new Error(data?.error || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('Erreur reset:', error);
      toast.error('Erreur lors de la réinitialisation', {
        description: error instanceof Error ? error.message : 'Une erreur est survenue'
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              Réinitialisation de la plateforme
            </CardTitle>
            <CardDescription>
              Cette action supprimera TOUS les chauffeurs et clients de la plateforme.
              Seul le compte admin sera conservé.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <h3 className="font-semibold text-destructive mb-2">⚠️ ATTENTION : Action irréversible</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Tous les chauffeurs seront supprimés</li>
                <li>• Tous les clients seront supprimés</li>
                <li>• Toutes les courses seront supprimées</li>
                <li>• Tous les devis et factures seront supprimés</li>
                <li>• Tous les QR codes seront supprimés</li>
                <li>• Toutes les conversations seront supprimées</li>
                <li>• Seul le compte admin sera conservé</li>
              </ul>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className="w-full"
                  disabled={isResetting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isResetting ? 'Réinitialisation en cours...' : 'Réinitialiser la plateforme'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est IRRÉVERSIBLE. Toutes les données des chauffeurs et clients seront définitivement supprimées.
                    La plateforme repartira de zéro avec uniquement le compte admin.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleReset}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Oui, réinitialiser la plateforme
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
