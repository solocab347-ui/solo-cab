/**
 * Hook d'optimisation pour les actions de courses du dashboard chauffeur
 * Utilise des mises à jour optimistes pour une réactivité maximale
 */

import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { notificationService } from '@/lib/notificationService';

interface CourseActionResult {
  success: boolean;
  error?: string;
}

interface OptimisticUpdateOptions {
  showToast?: boolean;
  invalidateQueries?: boolean;
}

/**
 * Hook qui fournit des actions optimisées pour les courses
 * avec mises à jour optimistes et rollback en cas d'erreur
 */
export const useOptimisticCourseActions = (
  driverId: string,
  setCourses: React.Dispatch<React.SetStateAction<any[]>>
) => {
  const queryClient = useQueryClient();
  const pendingActions = useRef<Map<string, AbortController>>(new Map());

  // Annule une action en cours si une nouvelle est déclenchée
  const cancelPendingAction = useCallback((courseId: string) => {
    const controller = pendingActions.current.get(courseId);
    if (controller) {
      controller.abort();
      pendingActions.current.delete(courseId);
    }
  }, []);

  /**
   * Accepter une course avec mise à jour optimiste
   */
  const acceptCourse = useCallback(async (
    courseId: string, 
    options: OptimisticUpdateOptions = { showToast: true }
  ): Promise<CourseActionResult> => {
    cancelPendingAction(courseId);
    const controller = new AbortController();
    pendingActions.current.set(courseId, controller);

    // Capturer l'état précédent pour rollback
    let previousCourses: any[] = [];
    
    // Mise à jour optimiste immédiate
    setCourses(prev => {
      previousCourses = prev;
      return prev.map(c => 
        c.id === courseId ? { ...c, status: 'accepted' as const, _optimistic: true } : c
      );
    });

    try {
      const { error } = await supabase
        .from('courses')
        .update({ status: 'accepted' })
        .eq('id', courseId);

      if (error) throw error;

      // Confirmer la mise à jour
      setCourses(prev => prev.map(c => 
        c.id === courseId ? { ...c, _optimistic: false } : c
      ));

      if (options.showToast) {
        toast.success('Course acceptée');
      }

      if (options.invalidateQueries) {
        queryClient.invalidateQueries({ queryKey: ['courses', driverId] });
      }

      return { success: true };
    } catch (error: any) {
      if (controller.signal.aborted) return { success: false, error: 'Cancelled' };
      
      // Rollback
      setCourses(previousCourses);
      toast.error('Erreur: ' + (error.message || 'Échec acceptation'));
      return { success: false, error: error.message };
    } finally {
      pendingActions.current.delete(courseId);
    }
  }, [driverId, setCourses, cancelPendingAction, queryClient]);

  /**
   * Démarrer une course (passer en "in_progress")
   */
  const startCourse = useCallback(async (
    courseId: string,
    options: OptimisticUpdateOptions = { showToast: true }
  ): Promise<CourseActionResult> => {
    cancelPendingAction(courseId);
    const controller = new AbortController();
    pendingActions.current.set(courseId, controller);

    let previousCourses: any[] = [];
    
    setCourses(prev => {
      previousCourses = prev;
      return prev.map(c => 
        c.id === courseId ? { ...c, status: 'in_progress' as const, _optimistic: true } : c
      );
    });

    try {
      const { error } = await supabase
        .from('courses')
        .update({ status: 'in_progress' })
        .eq('id', courseId);

      if (error) throw error;

      setCourses(prev => prev.map(c => 
        c.id === courseId ? { ...c, _optimistic: false } : c
      ));

      if (options.showToast) {
        toast.success('Course démarrée');
      }

      return { success: true };
    } catch (error: any) {
      if (controller.signal.aborted) return { success: false, error: 'Cancelled' };
      setCourses(previousCourses);
      toast.error('Erreur: ' + (error.message || 'Échec démarrage'));
      return { success: false, error: error.message };
    } finally {
      pendingActions.current.delete(courseId);
    }
  }, [setCourses, cancelPendingAction]);

  /**
   * Terminer une course rapidement (sans dialog de paiement)
   */
  const quickCompleteCourse = useCallback(async (
    courseId: string,
    paymentMethod: string = 'card',
    options: OptimisticUpdateOptions = { showToast: true }
  ): Promise<CourseActionResult> => {
    cancelPendingAction(courseId);
    const controller = new AbortController();
    pendingActions.current.set(courseId, controller);

    let previousCourses: any[] = [];
    
    setCourses(prev => {
      previousCourses = prev;
      return prev.map(c => 
        c.id === courseId ? { ...c, status: 'completed' as const, _optimistic: true } : c
      );
    });

    try {
      // Update status
      const { error: updateError } = await supabase
        .from('courses')
        .update({ status: 'completed' })
        .eq('id', courseId);

      if (updateError) throw updateError;

      // Generate facture in background (ne bloque pas l'UI)
      supabase.functions.invoke('create-facture-auto', {
        body: { course_id: courseId, payment_method: paymentMethod }
      }).catch(err => console.warn('Facture background error:', err));

      setCourses(prev => prev.map(c => 
        c.id === courseId ? { ...c, _optimistic: false } : c
      ));

      if (options.showToast) {
        toast.success('Course terminée');
      }

      return { success: true };
    } catch (error: any) {
      if (controller.signal.aborted) return { success: false, error: 'Cancelled' };
      setCourses(previousCourses);
      toast.error('Erreur: ' + (error.message || 'Échec complétion'));
      return { success: false, error: error.message };
    } finally {
      pendingActions.current.delete(courseId);
    }
  }, [setCourses, cancelPendingAction]);

  /**
   * Annuler une course
   */
  const cancelCourse = useCallback(async (
    courseId: string,
    reason: string,
    options: OptimisticUpdateOptions = { showToast: true }
  ): Promise<CourseActionResult> => {
    cancelPendingAction(courseId);
    const controller = new AbortController();
    pendingActions.current.set(courseId, controller);

    let previousCourses: any[] = [];
    
    setCourses(prev => {
      previousCourses = prev;
      return prev.map(c => 
        c.id === courseId ? { 
          ...c, 
          status: 'cancelled' as const,
          notes: `Motif: ${reason}\n\n${c.notes || ''}`,
          _optimistic: true 
        } : c
      );
    });

    try {
      const course = previousCourses.find(c => c.id === courseId);
      
      const { error } = await supabase
        .from('courses')
        .update({ 
          status: 'cancelled',
          notes: `Motif de refus: ${reason}\n\n${course?.notes || ''}`
        })
        .eq('id', courseId);

      if (error) throw error;

      setCourses(prev => prev.map(c => 
        c.id === courseId ? { ...c, _optimistic: false } : c
      ));

      if (options.showToast) {
        toast.success('Course annulée');
      }

      return { success: true };
    } catch (error: any) {
      if (controller.signal.aborted) return { success: false, error: 'Cancelled' };
      setCourses(previousCourses);
      toast.error('Erreur: ' + (error.message || 'Échec annulation'));
      return { success: false, error: error.message };
    } finally {
      pendingActions.current.delete(courseId);
    }
  }, [setCourses, cancelPendingAction]);

  /**
   * Validation batch de plusieurs actions
   */
  const batchUpdateStatus = useCallback(async (
    updates: Array<{ courseId: string; status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' }>
  ): Promise<CourseActionResult> => {
    let previousCourses: any[] = [];
    
    setCourses(prev => {
      previousCourses = prev;
      return prev.map(c => {
        const update = updates.find(u => u.courseId === c.id);
        return update ? { ...c, status: update.status, _optimistic: true } : c;
      });
    });

    try {
      // Execute updates in parallel
      await Promise.all(updates.map(({ courseId, status }) => 
        supabase
          .from('courses')
          .update({ status: status as any })
          .eq('id', courseId)
      ));

      setCourses(prev => prev.map(c => ({ ...c, _optimistic: false })));
      toast.success(`${updates.length} courses mises à jour`);
      return { success: true };
    } catch (error: any) {
      setCourses(previousCourses);
      toast.error('Erreur lors de la mise à jour batch');
      return { success: false, error: error.message };
    }
  }, [setCourses]);

  return {
    acceptCourse,
    startCourse,
    quickCompleteCourse,
    cancelCourse,
    batchUpdateStatus,
    cancelPendingAction
  };
};
