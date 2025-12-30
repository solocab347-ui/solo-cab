import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CommissionReminder {
  id: string;
  type: 'fleet' | 'partner';
  partnerName: string;
  partnerPhoto?: string;
  partnershipId: string;
  amount: number;
  commissionPercentage: number;
  dueDate: string;
  paymentSchedule: string;
  coursesCount: number;
  isOverdue: boolean;
  daysSinceDue: number;
}

interface UseCommissionRemindersResult {
  reminders: CommissionReminder[];
  pendingCount: number;
  overdueCount: number;
  totalDue: number;
  loading: boolean;
  markAsPaid: (reminderId: string, partnershipId: string, type: 'fleet' | 'partner') => Promise<void>;
  dismissReminder: (reminderId: string) => void;
  refreshReminders: () => Promise<void>;
}

export function useCommissionReminders(driverId: string | null): UseCommissionRemindersResult {
  const [reminders, setReminders] = useState<CommissionReminder[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchReminders = useCallback(async () => {
    if (!driverId) {
      setReminders([]);
      setLoading(false);
      return;
    }

    try {
      const allReminders: CommissionReminder[] = [];
      const now = new Date();

      // 1. Fetch fleet partnership commissions dues
      const { data: fleetPartnerships } = await supabase
        .from('fleet_driver_partnerships')
        .select(`
          id,
          commission_percentage,
          payment_schedule,
          next_payment_date,
          total_owed,
          fleet_manager_id,
          fleet_managers!inner(company_name, logo_url, user_id)
        `)
        .eq('driver_id', driverId)
        .eq('status', 'active');

      for (const partnership of fleetPartnerships || []) {
        // Check if there's pending amount
        const totalOwed = (partnership as any).total_owed || 0;
        
        if (totalOwed > 0) {
          // Calculate due date
          let dueDate = new Date();
          const nextPaymentDate = (partnership as any).next_payment_date;
          
          if (nextPaymentDate) {
            dueDate = new Date(nextPaymentDate);
          } else if ((partnership as any).payment_schedule === 'monthly') {
            dueDate.setDate(1);
            dueDate.setMonth(dueDate.getMonth() + 1);
          } else if ((partnership as any).payment_schedule === 'weekly') {
            dueDate.setDate(dueDate.getDate() + (7 - dueDate.getDay()));
          }

          const isOverdue = dueDate < now;
          const daysDiff = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

          const fleetManager = (partnership as any).fleet_managers;
          
          allReminders.push({
            id: `fleet-${partnership.id}`,
            type: 'fleet',
            partnerName: fleetManager?.company_name || 'Gestionnaire',
            partnerPhoto: fleetManager?.logo_url,
            partnershipId: partnership.id,
            amount: totalOwed,
            commissionPercentage: (partnership as any).commission_percentage || 0,
            dueDate: dueDate.toISOString(),
            paymentSchedule: (partnership as any).payment_schedule || 'monthly',
            coursesCount: 0, // Will be calculated if needed
            isOverdue,
            daysSinceDue: isOverdue ? daysDiff : 0,
          });
        }
      }

      // 2. Fetch driver partnership balances
      const { data: driverPartnerships } = await supabase
        .from('driver_partnerships')
        .select('*')
        .or(`driver_a_id.eq.${driverId},driver_b_id.eq.${driverId}`)
        .eq('status', 'active');

      for (const partnership of driverPartnerships || []) {
        const partnerId = partnership.driver_a_id === driverId 
          ? partnership.driver_b_id 
          : partnership.driver_a_id;

        // Get balance
        const { data: balanceData } = await supabase.rpc('get_partnership_balance', {
          _partnership_id: partnership.id,
          _driver_id: driverId
        });

        const balance = balanceData?.[0];
        
        // Only add if we owe them money (positive balance means we owe)
        if (balance && balance.net_balance > 0) {
          // Get partner info
          const { data: partnerDriver } = await supabase
            .from('drivers')
            .select('user_id, company_name')
            .eq('id', partnerId)
            .single();

          if (partnerDriver) {
            const { data: partnerProfile } = await supabase
              .from('profiles')
              .select('full_name, profile_photo_url')
              .eq('id', partnerDriver.user_id)
              .single();

            // Calculate due date based on payment schedule
            let dueDate = new Date();
            const paymentDay = partnership.payment_day || 1;
            
            if (partnership.payment_schedule === 'monthly') {
              dueDate.setDate(paymentDay);
              if (dueDate < now) {
                dueDate.setMonth(dueDate.getMonth() + 1);
              }
            } else if (partnership.payment_schedule === 'weekly') {
              dueDate.setDate(dueDate.getDate() + (7 - dueDate.getDay()));
            }

            const isOverdue = dueDate < now;
            const daysDiff = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

            allReminders.push({
              id: `partner-${partnership.id}`,
              type: 'partner',
              partnerName: partnerProfile?.full_name || partnerDriver.company_name || 'Partenaire',
              partnerPhoto: partnerProfile?.profile_photo_url || undefined,
              partnershipId: partnership.id,
              amount: balance.net_balance,
              commissionPercentage: partnership.commission_percentage || 0,
              dueDate: dueDate.toISOString(),
              paymentSchedule: partnership.payment_schedule || 'monthly',
              coursesCount: balance.courses_received || 0,
              isOverdue,
              daysSinceDue: isOverdue ? daysDiff : 0,
            });
          }
        }
      }

      // Sort by urgency: overdue first, then by amount
      allReminders.sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return b.amount - a.amount;
      });

      // Filter out dismissed reminders
      const filteredReminders = allReminders.filter(r => !dismissedIds.has(r.id));
      setReminders(filteredReminders);
    } catch (error) {
      console.error('Error fetching commission reminders:', error);
    } finally {
      setLoading(false);
    }
  }, [driverId, dismissedIds]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const markAsPaid = async (reminderId: string, partnershipId: string, type: 'fleet' | 'partner') => {
    try {
      if (type === 'fleet') {
        // Update fleet partnership - mark total_owed as paid
        const { data: partnership } = await supabase
          .from('fleet_driver_partnerships')
          .select('total_owed, total_paid')
          .eq('id', partnershipId)
          .single();

        if (partnership) {
          const { error } = await supabase
            .from('fleet_driver_partnerships')
            .update({ 
              total_paid: (partnership.total_paid || 0) + (partnership.total_owed || 0),
              total_owed: 0,
              last_payment_date: new Date().toISOString()
            })
            .eq('id', partnershipId);

          if (error) throw error;
        }
      } else {
        // For partner commissions, update shared_courses status to 'paid'
        const { error } = await supabase
          .from('shared_courses')
          .update({ status: 'paid' })
          .eq('partnership_id', partnershipId)
          .eq('status', 'completed');

        if (error) throw error;
      }

      // Remove from local state
      setReminders(prev => prev.filter(r => r.id !== reminderId));
    } catch (error) {
      console.error('Error marking commission as paid:', error);
      throw error;
    }
  };

  const dismissReminder = (reminderId: string) => {
    setDismissedIds(prev => new Set([...prev, reminderId]));
    setReminders(prev => prev.filter(r => r.id !== reminderId));
  };

  const pendingCount = reminders.filter(r => !r.isOverdue).length;
  const overdueCount = reminders.filter(r => r.isOverdue).length;
  const totalDue = reminders.reduce((sum, r) => sum + r.amount, 0);

  return {
    reminders,
    pendingCount,
    overdueCount,
    totalDue,
    loading,
    markAsPaid,
    dismissReminder,
    refreshReminders: fetchReminders,
  };
}
