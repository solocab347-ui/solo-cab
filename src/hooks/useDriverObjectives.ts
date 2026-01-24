import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  DriverObjective, 
  DriverPlatform, 
  DriverDailyEntry, 
  DriverCoachingMessage,
  DriverWorkSchedule,
  PeriodStats,
  ObjectiveProgress 
} from '@/components/driver/objectives/types';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay, endOfWeek, endOfMonth, endOfYear, format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function useDriverObjectives(driverId: string | null) {
  const [objectives, setObjectives] = useState<DriverObjective[]>([]);
  const [platforms, setPlatforms] = useState<DriverPlatform[]>([]);
  const [dailyEntries, setDailyEntries] = useState<DriverDailyEntry[]>([]);
  const [coachingMessages, setCoachingMessages] = useState<DriverCoachingMessage[]>([]);
  const [schedule, setSchedule] = useState<DriverWorkSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ObjectiveProgress[]>([]);

  const fetchAll = useCallback(async () => {
    if (!driverId) return;
    setLoading(true);

    try {
      const [objectivesRes, platformsRes, entriesRes, messagesRes, scheduleRes] = await Promise.all([
        supabase.from('driver_objectives').select('*').eq('driver_id', driverId),
        supabase.from('driver_platforms').select('*').eq('driver_id', driverId).order('display_order'),
        supabase.from('driver_daily_entries').select('*, platform:driver_platforms(*)').eq('driver_id', driverId).order('entry_date', { ascending: false }).limit(100),
        supabase.from('driver_coaching_messages').select('*').eq('driver_id', driverId).order('created_at', { ascending: false }).limit(20),
        supabase.from('driver_work_schedule').select('*').eq('driver_id', driverId).order('day_of_week'),
      ]);

      if (objectivesRes.data) setObjectives(objectivesRes.data as DriverObjective[]);
      if (platformsRes.data) setPlatforms(platformsRes.data as DriverPlatform[]);
      if (entriesRes.data) setDailyEntries(entriesRes.data as DriverDailyEntry[]);
      if (messagesRes.data) setCoachingMessages(messagesRes.data as DriverCoachingMessage[]);
      if (scheduleRes.data) setSchedule(scheduleRes.data as DriverWorkSchedule[]);
    } catch (error) {
      console.error('Error fetching objectives data:', error);
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  // Fetch SoloCab stats automatically
  const fetchSoloCabStats = useCallback(async (date: Date) => {
    if (!driverId) return null;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Get courses completed on this date
    const { data: courses } = await supabase
      .from('courses')
      .select('id, price, distance_km, duration_minutes, client_id')
      .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
      .eq('status', 'completed')
      .gte('scheduled_date', `${dateStr}T00:00:00`)
      .lte('scheduled_date', `${dateStr}T23:59:59`);
    // Get new clients registered this date
    const { data: newClients } = await supabase
      .from('clients')
      .select('id')
      .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
      .gte('created_at', `${dateStr}T00:00:00`)
      .lte('created_at', `${dateStr}T23:59:59`);

    if (!courses) return null;

    return {
      revenue: courses.reduce((sum, c: any) => sum + (c.price || 0), 0),
      courses_count: courses.length,
      new_clients_count: newClients?.length || 0,
      km_driven: courses.reduce((sum, c: any) => sum + (c.distance_km || 0), 0),
      hours_worked: courses.reduce((sum, c: any) => sum + ((c.duration_minutes || 0) / 60), 0),
    };
  }, [driverId]);

  // Calculate progress for all periods
  const calculateProgress = useCallback(async () => {
    if (!driverId) return;

    const now = new Date();
    const periods: ('daily' | 'weekly' | 'monthly' | 'yearly')[] = ['daily', 'weekly', 'monthly', 'yearly'];
    const progressData: ObjectiveProgress[] = [];

    for (const period of periods) {
      let startDate: Date, endDate: Date;
      
      switch (period) {
        case 'daily':
          startDate = startOfDay(now);
          endDate = endOfDay(now);
          break;
        case 'weekly':
          startDate = startOfWeek(now, { locale: fr });
          endDate = endOfWeek(now, { locale: fr });
          break;
        case 'monthly':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case 'yearly':
          startDate = startOfYear(now);
          endDate = endOfYear(now);
          break;
      }

      // Get entries for this period
      const periodEntries = dailyEntries.filter(e => {
        const entryDate = new Date(e.entry_date);
        return entryDate >= startDate && entryDate <= endDate;
      });

      // Calculate current stats
      const current: PeriodStats = {
        revenue: periodEntries.reduce((sum, e) => sum + (e.revenue || 0), 0),
        courses: periodEntries.reduce((sum, e) => sum + (e.courses_count || 0), 0),
        newClients: periodEntries.reduce((sum, e) => sum + (e.new_clients_count || 0), 0),
        hours: periodEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0),
        km: periodEntries.reduce((sum, e) => sum + (e.km_driven || 0), 0),
        averageRating: 0, // TODO: Calculate from courses
      };

      const objective = objectives.find(o => o.period_type === period) || null;

      const percentage = {
        revenue: objective?.revenue_target ? (current.revenue / objective.revenue_target) * 100 : 0,
        courses: objective?.courses_target ? (current.courses / objective.courses_target) * 100 : 0,
        newClients: objective?.new_clients_target ? (current.newClients / objective.new_clients_target) * 100 : 0,
        hours: objective?.hours_target ? (current.hours / objective.hours_target) * 100 : 0,
        km: objective?.km_target ? (current.km / objective.km_target) * 100 : 0,
      };

      progressData.push({ period, objective, current, percentage });
    }

    setProgress(progressData);
  }, [driverId, dailyEntries, objectives]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (dailyEntries.length > 0 || objectives.length > 0) {
      calculateProgress();
    }
  }, [dailyEntries, objectives, calculateProgress]);

  // CRUD operations
  const upsertObjective = async (data: Partial<DriverObjective> & { period_type: string }) => {
    if (!driverId) return null;
    
    const existing = objectives.find(o => o.period_type === data.period_type);
    
    if (existing) {
      const { data: updated, error } = await supabase
        .from('driver_objectives')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      await fetchAll();
      return updated;
    } else {
      const { data: created, error } = await supabase
        .from('driver_objectives')
        .insert({ ...data, driver_id: driverId })
        .select()
        .single();
      if (error) throw error;
      await fetchAll();
      return created;
    }
  };

  const addPlatform = async (name: string, icon: string = 'car') => {
    if (!driverId) return null;
    const { data, error } = await supabase
      .from('driver_platforms')
      .insert({ driver_id: driverId, platform_name: name, platform_icon: icon, display_order: platforms.length })
      .select()
      .single();
    if (error) throw error;
    await fetchAll();
    return data;
  };

  const removePlatform = async (platformId: string) => {
    const { error } = await supabase.from('driver_platforms').delete().eq('id', platformId);
    if (error) throw error;
    await fetchAll();
  };

  const upsertDailyEntry = async (entry: Partial<DriverDailyEntry> & { entry_date: string }) => {
    if (!driverId) return null;

    const existing = dailyEntries.find(e => 
      e.entry_date === entry.entry_date && 
      e.platform_id === entry.platform_id && 
      e.is_solocab === entry.is_solocab
    );

    if (existing) {
      const { data, error } = await supabase
        .from('driver_daily_entries')
        .update({ ...entry, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      await fetchAll();
      return data;
    } else {
      const { data, error } = await supabase
        .from('driver_daily_entries')
        .insert({ ...entry, driver_id: driverId })
        .select()
        .single();
      if (error) throw error;
      await fetchAll();
      return data;
    }
  };

  const syncSoloCabData = async (date: Date) => {
    const stats = await fetchSoloCabStats(date);
    if (!stats) return;

    await upsertDailyEntry({
      entry_date: format(date, 'yyyy-MM-dd'),
      is_solocab: true,
      platform_id: null,
      ...stats,
    });
  };

  const upsertSchedule = async (dayOfWeek: number, data: Partial<DriverWorkSchedule>) => {
    if (!driverId) return null;

    const existing = schedule.find(s => s.day_of_week === dayOfWeek);

    if (existing) {
      const { data: updated, error } = await supabase
        .from('driver_work_schedule')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      await fetchAll();
      return updated;
    } else {
      const { data: created, error } = await supabase
        .from('driver_work_schedule')
        .insert({ ...data, driver_id: driverId, day_of_week: dayOfWeek })
        .select()
        .single();
      if (error) throw error;
      await fetchAll();
      return created;
    }
  };

  const markMessageRead = async (messageId: string) => {
    const { error } = await supabase
      .from('driver_coaching_messages')
      .update({ is_read: true })
      .eq('id', messageId);
    if (error) throw error;
    await fetchAll();
  };

  return {
    objectives,
    platforms,
    dailyEntries,
    coachingMessages,
    schedule,
    progress,
    loading,
    fetchAll,
    upsertObjective,
    addPlatform,
    removePlatform,
    upsertDailyEntry,
    syncSoloCabData,
    upsertSchedule,
    markMessageRead,
    fetchSoloCabStats,
  };
}
