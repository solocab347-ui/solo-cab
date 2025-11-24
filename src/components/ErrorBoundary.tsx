import React, { Component, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimer: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorCount: 0 };
    
    // Écouter les erreurs non gérées
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
    console.error('Global error:', event.error);
    this.setState(prevState => ({
      hasError: true,
      error: event.error,
      errorCount: prevState.errorCount + 1
    }));
  };

  handlePromiseRejection = (event: PromiseRejectionEvent) => {
    console.error('Unhandled promise rejection:', event.reason);
    this.setState(prevState => ({
      hasError: true,
      error: new Error(event.reason?.message || 'Promise rejection'),
      errorCount: prevState.errorCount + 1
    }));
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Auto-reset après trop d'erreurs consécutives
    if (this.state.errorCount > 3) {
      console.warn('Too many errors, forcing reload...');
      this.resetTimer = setTimeout(() => {
        window.location.reload();
      }, 5000);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorCount: 0 });
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
    window.location.reload();
  };

  handleSoftReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorCount: 0 });
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
              Si le problème persiste, contactez le support.
            </p>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
