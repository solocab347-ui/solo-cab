/**
 * SYSTÈME DE LOGGING PRODUCTION - SOLOCAB
 * Remplace tous les console.log/error/warn par un système centralisé
 * - Logs désactivés en production sauf erreurs critiques
 * - Filtrage automatique des données sensibles
 * - Niveaux de log avec contexte
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  timestamp: string;
  userId?: string;
}

class ProductionLogger {
  private isDevelopment = import.meta.env.DEV;
  private sensitiveKeys = [
    'password',
    'token',
    'apikey',
    'secret',
    'authorization',
    'stripe',
    'card',
    'cvv',
    'ssn',
    'siret',
    'siren'
  ];

  /**
   * Filtre les données sensibles d'un objet
   */
  private sanitize(data: any): any {
    if (typeof data !== 'object' || data === null) return data;
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const keyLower = key.toLowerCase();
      const isSensitive = this.sensitiveKeys.some(sensitive => 
        keyLower.includes(sensitive)
      );

      if (isSensitive) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Log un message avec contexte
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    // En production, log seulement warn/error/critical
    if (!this.isDevelopment && ['debug', 'info'].includes(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      context: context ? this.sanitize(context) : undefined,
      timestamp: new Date().toISOString(),
    };

    // En dev, afficher dans console avec couleurs
    if (this.isDevelopment) {
      const styles: Record<LogLevel, string> = {
        debug: 'color: #888',
        info: 'color: #0ea5e9',
        warn: 'color: #f59e0b',
        error: 'color: #ef4444',
        critical: 'color: #dc2626; font-weight: bold'
      };

      const emoji: Record<LogLevel, string> = {
        debug: '🔍',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
        critical: '🚨'
      };

      console.log(
        `%c${emoji[level]} [${level.toUpperCase()}] ${message}`,
        styles[level],
        context ? entry.context : ''
      );
    } else {
      // En production, envoyer à un service de monitoring
      // TODO: Intégrer Sentry/LogRocket/DataDog ici
      if (['error', 'critical'].includes(level)) {
        console.error(JSON.stringify(entry));
      }
    }
  }

  /**
   * Logs par niveau
   */
  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, any>) {
    this.log('error', message, context);
  }

  critical(message: string, context?: Record<string, any>) {
    this.log('critical', message, context);
  }

  /**
   * Log une performance lente
   */
  performance(operation: string, duration: number, threshold = 1000) {
    if (duration > threshold) {
      this.warn(`Opération lente: ${operation}`, { 
        duration: `${duration.toFixed(0)}ms`,
        threshold: `${threshold}ms`
      });
    }
  }

  /**
   * Log une erreur avec stack trace
   */
  exception(error: Error | unknown, context?: Record<string, any>) {
    const errorInfo = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : {
      message: String(error)
    };

    this.error('Exception caught', {
      ...errorInfo,
      ...context
    });
  }

  /**
   * Mesure l'exécution d'une fonction
   */
  async measure<T>(
    operation: () => Promise<T>,
    label: string
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - start;
      this.performance(label, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`${label} failed after ${duration.toFixed(0)}ms`);
      throw error;
    }
  }
}

// Export singleton
export const logger = new ProductionLogger();

// Helpers rapides
export const logDebug = (msg: string, ctx?: Record<string, any>) => logger.debug(msg, ctx);
export const logInfo = (msg: string, ctx?: Record<string, any>) => logger.info(msg, ctx);
export const logWarn = (msg: string, ctx?: Record<string, any>) => logger.warn(msg, ctx);
export const logError = (msg: string, ctx?: Record<string, any>) => logger.error(msg, ctx);
export const logCritical = (msg: string, ctx?: Record<string, any>) => logger.critical(msg, ctx);
