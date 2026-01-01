import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface ErrorReportButtonProps {
  error: Error | null;
  errorStack?: string;
}

export const ErrorReportButton = ({ error, errorStack }: ErrorReportButtonProps) => {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { user } = useAuth();

  const getUserRole = async (): Promise<string> => {
    if (!user) return 'anonymous';
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    return data?.role || 'unknown';
  };

  const getUserProfile = async () => {
    if (!user) return { email: null, name: null };
    
    const { data } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single();
    
    return { email: data?.email, name: data?.full_name };
  };

  const handleSendReport = async () => {
    setSending(true);
    
    try {
      const userRole = await getUserRole();
      const profile = await getUserProfile();
      
      const reportData = {
        user_id: user?.id || null,
        user_role: userRole,
        user_email: profile.email,
        user_name: profile.name,
        error_message: error?.message || 'Erreur inconnue',
        error_stack: errorStack || error?.stack || null,
        page_url: window.location.href,
        page_route: window.location.pathname,
        user_agent: navigator.userAgent,
        screen_size: `${window.innerWidth}x${window.innerHeight}`,
        browser_info: JSON.stringify({
          language: navigator.language,
          platform: navigator.platform,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine,
          timestamp: new Date().toISOString()
        }),
        additional_context: {
          referrer: document.referrer,
          localStorage_locale: localStorage.getItem('locale'),
          sessionStorage_keys: Object.keys(sessionStorage)
        }
      };

      const { error: insertError } = await supabase
        .from('error_reports')
        .insert(reportData);

      if (insertError) throw insertError;

      setSent(true);
      toast.success('Rapport envoyé à l\'administrateur', {
        description: 'Nous examinerons le problème rapidement.'
      });
    } catch (err) {
      console.error('Error sending report:', err);
      toast.error('Impossible d\'envoyer le rapport', {
        description: 'Veuillez réessayer plus tard.'
      });
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <Button 
        variant="outline" 
        className="w-full gap-2 border-success/50 text-success bg-success/10"
        disabled
      >
        <CheckCircle className="w-4 h-4" />
        Rapport envoyé
      </Button>
    );
  }

  return (
    <Button 
      variant="outline" 
      onClick={handleSendReport}
      disabled={sending}
      className="w-full gap-2 border-primary/50 text-primary hover:bg-primary/10"
    >
      {sending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Envoi en cours...
        </>
      ) : (
        <>
          <Send className="w-4 h-4" />
          Signaler à l'administrateur
        </>
      )}
    </Button>
  );
};

export default ErrorReportButton;
