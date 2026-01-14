/**
 * File d'attente des mutations hors ligne
 * Stocke les actions en attente et les synchronise automatiquement au retour de connexion
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/productionLogger';

// Types de mutations supportées
type MutationType = 
  | 'create_course'
  | 'update_course_status'
  | 'update_course'
  | 'create_client_note'
  | 'update_profile';

interface PendingMutation {
  id: string;
  type: MutationType;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: Record<string, any>;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

interface MutationQueueState {
  pending: PendingMutation[];
  failed: PendingMutation[];
  syncing: boolean;
}

const STORAGE_KEY = 'solocab-offline-mutations';
const MAX_RETRIES = 3;

class OfflineMutationQueue {
  private state: MutationQueueState = {
    pending: [],
    failed: [],
    syncing: false,
  };
  private listeners: Set<(state: MutationQueueState) => void> = new Set();

  constructor() {
    this.loadFromStorage();
    this.setupNetworkListener();
  }

  /**
   * Charge les mutations en attente depuis le stockage
   */
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.state.pending = parsed.pending || [];
        this.state.failed = parsed.failed || [];
        logger.info('[MutationQueue] Loaded from storage', {
          pending: this.state.pending.length,
          failed: this.state.failed.length,
        });
      }
    } catch (error) {
      logger.error('[MutationQueue] Error loading from storage', { error });
    }
  }

  /**
   * Sauvegarde les mutations dans le stockage
   */
  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        pending: this.state.pending,
        failed: this.state.failed,
      }));
    } catch (error) {
      logger.error('[MutationQueue] Error saving to storage', { error });
    }
  }

  /**
   * Configure l'écoute des changements de réseau
   */
  private setupNetworkListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        logger.info('[MutationQueue] Network online - starting sync');
        this.syncPendingMutations();
      });
    }
  }

  /**
   * Ajoute une mutation à la file d'attente
   */
  async addMutation(
    type: MutationType,
    table: string,
    operation: 'insert' | 'update' | 'delete',
    data: Record<string, any>
  ): Promise<string> {
    const mutation: PendingMutation = {
      id: `mut_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      table,
      operation,
      data,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    this.state.pending.push(mutation);
    this.saveToStorage();
    this.notifyListeners();

    logger.info('[MutationQueue] Mutation added', { id: mutation.id, type, table });

    // Si en ligne, tenter de synchroniser immédiatement
    if (navigator.onLine) {
      this.syncPendingMutations();
    }

    return mutation.id;
  }

  /**
   * Synchronise les mutations en attente
   */
  async syncPendingMutations(): Promise<{ success: number; failed: number }> {
    if (this.state.syncing || this.state.pending.length === 0) {
      return { success: 0, failed: 0 };
    }

    this.state.syncing = true;
    this.notifyListeners();

    let successCount = 0;
    let failedCount = 0;

    logger.info('[MutationQueue] Starting sync', { pending: this.state.pending.length });

    // Traiter les mutations dans l'ordre
    const toProcess = [...this.state.pending];

    for (const mutation of toProcess) {
      try {
        await this.executeMutation(mutation);
        
        // Succès - retirer de la file
        this.state.pending = this.state.pending.filter(m => m.id !== mutation.id);
        successCount++;
        logger.info('[MutationQueue] Mutation synced', { id: mutation.id });
      } catch (error: any) {
        mutation.retryCount++;
        mutation.lastError = error?.message || 'Unknown error';

        if (mutation.retryCount >= MAX_RETRIES) {
          // Déplacer vers les échecs
          this.state.pending = this.state.pending.filter(m => m.id !== mutation.id);
          this.state.failed.push(mutation);
          failedCount++;
          logger.error('[MutationQueue] Mutation failed permanently', { id: mutation.id, error: mutation.lastError });
        } else {
          logger.warn('[MutationQueue] Mutation failed, will retry', { 
            id: mutation.id, 
            retryCount: mutation.retryCount,
            error: mutation.lastError,
          });
        }
      }
    }

    this.state.syncing = false;
    this.saveToStorage();
    this.notifyListeners();

    logger.info('[MutationQueue] Sync complete', { success: successCount, failed: failedCount });

    return { success: successCount, failed: failedCount };
  }

  /**
   * Exécute une mutation individuelle
   */
  private async executeMutation(mutation: PendingMutation): Promise<void> {
    const { table, operation, data } = mutation;

    let result;

    switch (operation) {
      case 'insert':
        result = await supabase.from(table as any).insert(data);
        break;
      case 'update':
        if (!data.id) throw new Error('Update requires id');
        const { id, ...updateData } = data;
        result = await supabase.from(table as any).update(updateData).eq('id', id);
        break;
      case 'delete':
        if (!data.id) throw new Error('Delete requires id');
        result = await supabase.from(table as any).delete().eq('id', data.id);
        break;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

    if (result.error) {
      throw result.error;
    }
  }

  /**
   * Retente les mutations échouées
   */
  async retryFailedMutations(): Promise<{ success: number; failed: number }> {
    if (this.state.failed.length === 0) {
      return { success: 0, failed: 0 };
    }

    // Déplacer les échecs vers la file d'attente en réinitialisant le compteur
    const toRetry = this.state.failed.map(m => ({
      ...m,
      retryCount: 0,
      lastError: undefined,
    }));

    this.state.failed = [];
    this.state.pending.push(...toRetry);
    this.saveToStorage();

    return this.syncPendingMutations();
  }

  /**
   * Supprime une mutation échouée
   */
  removeFailedMutation(id: string): void {
    this.state.failed = this.state.failed.filter(m => m.id !== id);
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Efface toutes les mutations échouées
   */
  clearFailedMutations(): void {
    this.state.failed = [];
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * S'abonner aux changements d'état
   */
  subscribe(callback: (state: MutationQueueState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    const stateCopy = {
      pending: [...this.state.pending],
      failed: [...this.state.failed],
      syncing: this.state.syncing,
    };
    this.listeners.forEach(cb => {
      try {
        cb(stateCopy);
      } catch (e) {
        logger.error('[MutationQueue] Listener error', { error: e });
      }
    });
  }

  /**
   * Obtient l'état actuel
   */
  getState(): MutationQueueState {
    return {
      pending: [...this.state.pending],
      failed: [...this.state.failed],
      syncing: this.state.syncing,
    };
  }

  /**
   * Vérifie s'il y a des mutations en attente
   */
  hasPendingMutations(): boolean {
    return this.state.pending.length > 0;
  }

  /**
   * Compte des mutations
   */
  get pendingCount(): number {
    return this.state.pending.length;
  }

  get failedCount(): number {
    return this.state.failed.length;
  }
}

export const offlineMutationQueue = new OfflineMutationQueue();
export type { PendingMutation, MutationQueueState, MutationType };
