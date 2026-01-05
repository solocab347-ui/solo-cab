import React, { Component, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { captureError } from '@/lib/sentry';
import { logger } from '@/lib/productionLogger';
import { ErrorReportButton } from '@/components/ErrorReportButton';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
  componentStack?: string;
}

// Liste des erreurs à ignorer (erreurs non-critiques courantes)
const IGNORED_ERROR_PATTERNS = [
  'ResizeObserver loop',
  'ResizeObserver loop completed with undelivered notifications',
  'Script error',
  'ChunkLoadError',
  'Loading chunk',
  'Failed to fetch',
  'NetworkError',
  'Network request failed',
  'AbortError',
  'The operation was aborted',
  'Load failed',
  'cancelled',
  'TypeError: cancelled',
  'Error: cancelled',
  'The user aborted a request',
  'NotAllowedError',
  'QuotaExceededError',
  'Notification permission',
  'Permission denied',
  'Cannot read properties of null',
  'Cannot read properties of undefined',
  'Unexpected end of JSON input',
  'JSON.parse:',
  'undefined is not an object',
  'null is not an object',
  'is not a function',
  'Cannot set properties of null',
  'Cannot set properties of undefined',
  // React concurrent mode errors
  'minified React error',
  'Hydration failed',
  // Supabase benign errors
  'session_not_found',
  'JWT expired',
  'refresh_token_not_found',
  'PGRST',
  // Navigation/Router errors
  'Navigation cancelled',
  'A listener indicated an asynchronous response',
];

// Vérifier si une erreur doit être ignorée
const shouldIgnoreError = (error: Error | null | undefined, reason?: any): boolean => {
  if (!error && !reason) return true;
  
  const message = error?.message || reason?.message || String(reason || '');
  const stack = error?.stack || '';
  
  // Ignorer les erreurs vides
  if (!message || message.trim() === '') return true;
  
  // Vérifier contre les patterns
  return IGNORED_ERROR_PATTERNS.some(pattern => 
    message.toLowerCase().includes(pattern.toLowerCase()) ||
    stack.toLowerCase().includes(pattern.toLowerCase())
  );
};

export class ErrorBoundary extends Component<Props, State> {
  private resetTimer: NodeJS.Timeout | null = null;
  private consecutiveErrors: number = 0;
  private lastErrorTime: number = 0;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorCount: 0 };
    
    // Écouter les erreurs non gérées - MAIS FILTRER les erreurs mineures
    if (typeof window !== 'undefined') {
      window.addEventListener('error', this.handleGlobalError);
      window.addEventListener('unhandledrejection', this.handlePromiseRejection);
    }
  }

  componentWillUnmount() {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('error', this.handleGlobalError);
      window.removeEventListener('unhandledrejection', this.handlePromiseRejection);
    }
  }

  handleGlobalError = (event: ErrorEvent) => {
    // FILTRER les erreurs mineures - ne pas interrompre l'UI
    if (shouldIgnoreError(event.error)) {
      logger.warn('Global error ignored (non-critical)', { message: event.error?.message });
      return;
    }
    
    // Vérifier si c'est une cascade d'erreurs (< 2s entre erreurs)
    const now = Date.now();
    if (now - this.lastErrorTime < 2000) {
      this.consecutiveErrors++;
      // Si plus de 5 erreurs consécutives, reload automatique
      if (this.consecutiveErrors > 5) {
        logger.critical('Error cascade detected, forcing reload');
        window.location.reload();
        return;
      }
    } else {
      this.consecutiveErrors = 0;
    }
    this.lastErrorTime = now;
    
    logger.critical('Critical global error', { error: event.error?.message });
    
    // Uniquement logger et envoyer à Sentry, NE PAS déclencher l'écran d'erreur
    captureError(event.error || new Error('Unknown global error'), {
      type: 'global',
      filename: event.filename,
      lineno: event.lineno,
    }, 'error');
  };

  handlePromiseRejection = (event: PromiseRejectionEvent) => {
    // FILTRER les rejections mineures
    if (shouldIgnoreError(null, event.reason)) {
      logger.warn('Promise rejection ignored (non-critical)', { reason: event.reason?.message || event.reason });
      return;
    }
    
    logger.critical('Critical promise rejection', { reason: event.reason });
    
    // Uniquement logger, NE PAS déclencher l'écran d'erreur pour les promesses
    captureError(
      new Error(event.reason?.message || String(event.reason) || 'Promise rejection'),
      { type: 'unhandledrejection' },
      'warning'
    );
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Filtrer les erreurs mineures au niveau React aussi
    if (shouldIgnoreError(error)) {
      return {}; // Ne pas mettre hasError à true
    }
    
    // Dismiss all toasts when a critical error occurs
    toast.dismiss();
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Filtrer les erreurs mineures
    if (shouldIgnoreError(error)) {
      logger.warn('Component error ignored', { message: error.message });
      return;
    }
    
    logger.critical('ErrorBoundary caught critical error', {
      errorMessage: error.message,
      errorStack: error.stack?.substring(0, 300),
      componentStack: errorInfo.componentStack?.substring(0, 300)
    });
    
    this.setState(prev => ({ 
      componentStack: errorInfo.componentStack || undefined,
      errorCount: prev.errorCount + 1
    }));
    
    // Envoyer à Sentry
    captureError(error, {
      componentStack: errorInfo.componentStack,
      errorCount: this.state.errorCount,
      errorBoundary: true,
    }, 'fatal');
    
    // Auto-reload seulement après BEAUCOUP d'erreurs
    if (this.state.errorCount > 5) {
      logger.warn('Too many errors, forcing reload', { errorCount: this.state.errorCount });
      this.resetTimer = setTimeout(() => {
        window.location.reload();
      }, 3000);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorCount: 0 });
    this.consecutiveErrors = 0;
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
    window.location.reload();
  };

  handleSoftReset = () => {
    this.setState({ hasError: false, error: null });
    this.consecutiveErrors = 0;
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorCount: 0 });
    this.consecutiveErrors = 0;
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center animate-pulse">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold mb-2">Une erreur est survenue</h1>
            <p className="text-muted-foreground mb-2">
              L'application a rencontré un problème inattendu.
            </p>
            
            {this.state.error && (
              <div className="bg-destructive/5 border border-destructive/20 rounded p-3 mb-4">
                <p className="text-xs font-mono text-destructive break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {this.state.errorCount > 1 && (
              <div className="bg-warning/10 border border-warning/20 rounded p-3 mb-4">
                <p className="text-sm text-warning">
                  ⚠️ Plusieurs erreurs détectées ({this.state.errorCount})
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <ErrorReportButton 
                error={this.state.error} 
                errorInfo={{ componentStack: this.state.componentStack } as React.ErrorInfo}
              />
              
              <Button onClick={this.handleReset} className="w-full gap-2">
                <RefreshCw className="w-4 h-4" />
                Recharger complètement
              </Button>
              
              <Button 
                variant="outline" 
                onClick={this.handleSoftReset}
                className="w-full"
              >
                Réessayer sans recharger
              </Button>

              <Button 
                variant="outline" 
                onClick={this.handleGoHome}
                className="w-full gap-2"
              >
                <Home className="w-4 h-4" />
                Retour à l'accueil
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Cliquez sur "Signaler à l'administrateur" pour nous aider à corriger ce problème.
            </p>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
