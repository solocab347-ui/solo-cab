import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Client Supabase optimisé avec gestion d'erreur et retry automatique
 */
class OptimizedSupabaseClient {
  private client: SupabaseClient<Database>;
  private connectionRetries = 0;
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor() {
    this.client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          'x-client-info': 'solocab-web',
        },
      },
      db: {
        schema: 'public',
      },
      realtime: {
        params: {
          eventsPerSecond: 5, // Limiter les événements pour éviter la surcharge
        },
      },
    });

    // Monitor connection status
    this.setupConnectionMonitoring();
  }

  private setupConnectionMonitoring() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('✅ Connexion rétablie');
      this.connectionRetries = 0;
    });

    window.addEventListener('offline', () => {
      console.warn('⚠️ Connexion perdue');
    });
  }

  /**
   * Exécute une requête avec retry automatique
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string = 'operation'
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Ne pas retry si erreur d'authentification ou validation
        if (
          error.code === 'PGRST301' || // Auth required
          error.code === 'PGRST116' || // Invalid request
          error.message?.includes('JWT') ||
          error.message?.includes('credentials')
        ) {
          throw error;
        }

        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          console.warn(
            `⚠️ ${context} failed (attempt ${attempt + 1}/${this.maxRetries}), retrying in ${delay}ms...`
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`❌ ${context} failed after ${this.maxRetries} attempts`);
    throw lastError;
  }

  /**
   * Getter pour le client Supabase sous-jacent
   */
  get supabase() {
    return this.client;
  }
}

// Singleton instance
export const optimizedSupabase = new OptimizedSupabaseClient();

// Export du client pour compatibilité
export const supabaseOptimized = optimizedSupabase.supabase;
