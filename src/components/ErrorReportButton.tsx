import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Send, Loader2, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface ErrorReportButtonProps {
  error?: Error;
  errorInfo?: React.ErrorInfo;
  context?: string;
}

export const ErrorReportButton = ({ error, errorInfo, context }: ErrorReportButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, userRole } = useAuth();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const errorData = {
        user_id: user?.id || null,
        user_role: userRole || 'anonymous',
        error_message: error?.message || 'Erreur inconnue',
        error_stack: error?.stack || errorInfo?.componentStack || null,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        context: context || additionalInfo || null,
        status: 'pending',
      };

      const { data: reportData, error: insertError } = await supabase
        .from('error_reports')
        .insert(errorData)
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: "Rapport envoyé",
        description: "L'analyse automatique est en cours...",
      });

      // Trigger AI analysis with auto-fix
      setIsAnalyzing(true);
      try {
        const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-error', {
          body: {
            errorReportId: reportData.id,
            errorMessage: error?.message || 'Erreur inconnue',
            errorStack: error?.stack || errorInfo?.componentStack,
            pageUrl: window.location.href,
            context: context || additionalInfo,
            executeAutoFix: true, // Enable auto-fix
          },
        });

        if (analysisError) {
          console.error('Analysis error:', analysisError);
        } else if (analysisData) {
          setAiAnalysis(analysisData.analysis);
          
          // Check if auto-fix was executed
          if (analysisData.autoFixExecuted && analysisData.autoFixSuccess) {
            toast({
              title: "Problème résolu automatiquement",
              description: analysisData.userMessage || "L'IA a corrigé le problème.",
            });
            
            // Execute client-side actions if needed
            if (analysisData.autoFixAction === 'clear_local_cache') {
              localStorage.clear();
              sessionStorage.clear();
            } else if (analysisData.autoFixAction === 'clear_user_session') {
              await supabase.auth.signOut();
              window.location.reload();
            } else if (analysisData.autoFixAction === 'refresh_data') {
              window.location.reload();
            }
          } else {
            toast({
              title: "Analyse terminée",
              description: `Priorité: ${analysisData.priority || 'moyenne'}. ${analysisData.errorType === 'code_bug' ? 'Transmis à l\'admin.' : ''}`,
            });
          }
        }
      } catch (aiError) {
        console.error('AI analysis failed:', aiError);
      } finally {
        setIsAnalyzing(false);
      }

      setIsOpen(false);
      setAdditionalInfo('');
    } catch (err) {
      console.error('Error submitting report:', err);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le rapport",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <AlertTriangle className="h-4 w-4" />
          Signaler à l'administrateur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Signaler un problème
          </DialogTitle>
          <DialogDescription>
            Votre rapport sera analysé automatiquement par notre IA puis transmis à l'administrateur.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-destructive/10 p-3 text-sm">
            <p className="font-medium text-destructive">Erreur détectée:</p>
            <p className="text-muted-foreground">{error?.message || 'Erreur inconnue'}</p>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Page:</strong> {window.location.pathname}</p>
            <p><strong>Rôle:</strong> {userRole || 'Non connecté'}</p>
          </div>

          <Textarea
            placeholder="Décrivez ce que vous faisiez avant l'erreur (optionnel)..."
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            rows={3}
          />

          {aiAnalysis && (
            <div className="rounded-lg bg-primary/10 p-3 text-sm">
              <p className="font-medium text-primary flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Analyse IA:
              </p>
              <p className="text-muted-foreground mt-1">{aiAnalysis}</p>
            </div>
          )}

          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || isAnalyzing}
            className="w-full gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : isAnalyzing ? (
              <>
                <Bot className="h-4 w-4 animate-pulse" />
                Analyse IA en cours...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Envoyer et analyser
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default ErrorReportButton;
