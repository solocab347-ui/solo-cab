import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Download, ShieldAlert, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyMyData() {
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [reason, setReason] = useState('');

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error('Vous devez être connecté.');
        return;
      }
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gdpr-export-data`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Export échoué');
      }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `solocab-mes-donnees-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Export téléchargé.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur export');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (confirmation !== 'SUPPRIMER MON COMPTE') {
      toast.error('Veuillez taper exactement : SUPPRIMER MON COMPTE');
      return;
    }
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('gdpr-delete-account', {
        body: { confirmation, reason: reason || undefined },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error('Suppression incomplète');
      toast.success('Compte supprimé.');
      await supabase.auth.signOut();
      navigate('/');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur suppression');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl py-10 px-4">
      <Helmet>
        <title>Mes données personnelles — SoloCab</title>
        <meta name="description" content="Exportez ou supprimez vos données SoloCab conformément au RGPD." />
      </Helmet>

      <h1 className="text-3xl font-bold mb-2">Mes données personnelles</h1>
      <p className="text-muted-foreground mb-8">
        Vous disposez d'un droit d'accès, de portabilité et d'effacement (RGPD Art. 15, 17, 20).
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" /> Exporter mes données
          </CardTitle>
          <CardDescription>
            Téléchargez un fichier JSON contenant l'intégralité de vos données SoloCab : profil,
            courses, factures, messages, méthodes de paiement (sans numéro de carte).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Télécharger mon export
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" /> Supprimer mon compte
          </CardTitle>
          <CardDescription>
            Cette action est irréversible. Vos données seront supprimées sous 30 jours.
            Les factures sont conservées <strong>anonymisées</strong> pendant 10 ans
            (obligation légale comptable).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Motif (facultatif)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              placeholder="Aidez-nous à nous améliorer."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Tapez <code className="bg-muted px-1 rounded">SUPPRIMER MON COMPTE</code> pour confirmer
            </Label>
            <Input
              id="confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              autoComplete="off"
            />
          </div>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || confirmation !== 'SUPPRIMER MON COMPTE'}
          >
            {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Supprimer définitivement
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
