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
import { startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay, endOfWeek, endOfMonth, endOfYear, format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface DriverStats {
  totalClients: number;
  totalCourses: number;
  totalRevenue: number;
  soloCabPercentage: number;
  streakDays: number;
  partnershipsCount: number;
  isFirstClient: boolean;
  isFirstCourse: boolean;
  recentGrowth: number;
}

export interface SoloCabPeriodStats {
  courses: number;
  revenue: number;
  clients: number;
}

export interface SoloCabFullStats {
  today: SoloCabPeriodStats;
  week: SoloCabPeriodStats;
  month: SoloCabPeriodStats;
  year: SoloCabPeriodStats;
}

export function useDriverObjectives(driverId: string | null) {
  const [objectives, setObjectives] = useState<DriverObjective[]>([]);
  const [platforms, setPlatforms] = useState<DriverPlatform[]>([]);
  const [dailyEntries, setDailyEntries] = useState<DriverDailyEntry[]>([]);
  const [coachingMessages, setCoachingMessages] = useState<DriverCoachingMessage[]>([]);
  const [schedule, setSchedule] = useState<DriverWorkSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ObjectiveProgress[]>([]);
  const [driverStats, setDriverStats] = useState<DriverStats>({
    totalClients: 0,
    totalCourses: 0,
    totalRevenue: 0,
    soloCabPercentage: 0,
    streakDays: 0,
    partnershipsCount: 0,
    isFirstClient: false,
    isFirstCourse: false,
    recentGrowth: 0,
  });
  const [soloCabFullStats, setSoloCabFullStats] = useState<SoloCabFullStats>({
    today: { courses: 0, revenue: 0, clients: 0 },
    week: { courses: 0, revenue: 0, clients: 0 },
    month: { courses: 0, revenue: 0, clients: 0 },
    year: { courses: 0, revenue: 0, clients: 0 },
  });

  // Fetch all driver statistics for milestones and coaching
  const fetchDriverStats = useCallback(async () => {
    if (!driverId) return;

    try {
      // Get total clients
      const { count: clientCount } = await supabase
        .from('clients')
        .select('id', { count: 'exact' })
        .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`);

      // Get total courses completed
      const { data: courses, count: courseCount } = await supabase
        .from('courses')
        .select('id, final_price, created_at', { count: 'exact' })
        .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
        .eq('status', 'completed');

      // Get partnerships count
      const { count: partnerCount } = await supabase
        .from('driver_partnerships')
        .select('id', { count: 'exact' })
        .or(`requester_id.eq.${driverId},target_id.eq.${driverId}`)
        .eq('status', 'active');

      // Calculate total revenue from courses
      const totalRevenue = courses?.reduce((sum, c: any) => sum + (c.final_price || 0), 0) || 0;

      // Check if first client/course (simplified)
      const isFirstClient = clientCount === 1;
      const isFirstCourse = courseCount === 1;

      // Calculate SoloCab percentage (estimate based on entries)
      const soloCabEntries = dailyEntries.filter(e => e.is_solocab);
      const platformEntries = dailyEntries.filter(e => !e.is_solocab);
      const soloCabRevenue = soloCabEntries.reduce((sum, e) => sum + (e.revenue || 0), 0);
      const platformRevenue = platformEntries.reduce((sum, e) => sum + (e.revenue || 0), 0);
      const totalMonthlyRevenue = soloCabRevenue + platformRevenue;
      const soloCabPercentage = totalMonthlyRevenue > 0 
        ? (soloCabRevenue / totalMonthlyRevenue) * 100 
        : 0;

      // Calculate streak days (consecutive days meeting daily objectives)
      let streakDays = 0;
      const today = new Date();
      const dailyObjective = objectives.find(o => o.period_type === 'daily');
      
      if (dailyObjective) {
        for (let i = 0; i < 30; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(today.getDate() - i);
          const dateStr = format(checkDate, 'yyyy-MM-dd');
          
          const dayEntries = dailyEntries.filter(e => e.entry_date === dateStr);
          const dayRevenue = dayEntries.reduce((sum, e) => sum + (e.revenue || 0), 0);
          
          if (dayRevenue >= dailyObjective.revenue_target) {
            streakDays++;
          } else if (i > 0) {
            break;
          }
        }
      }

      // Calculate recent growth (compare last week to previous week)
      const lastWeekEntries = dailyEntries.filter(e => {
        const entryDate = new Date(e.entry_date);
        return differenceInDays(today, entryDate) <= 7;
      });
      const prevWeekEntries = dailyEntries.filter(e => {
        const entryDate = new Date(e.entry_date);
        const daysDiff = differenceInDays(today, entryDate);
        return daysDiff > 7 && daysDiff <= 14;
      });
      
      const lastWeekRevenue = lastWeekEntries.reduce((sum, e) => sum + (e.revenue || 0), 0);
      const prevWeekRevenue = prevWeekEntries.reduce((sum, e) => sum + (e.revenue || 0), 0);
      const recentGrowth = prevWeekRevenue > 0 
        ? ((lastWeekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100 
        : 0;

      setDriverStats({
        totalClients: clientCount || 0,
        totalCourses: courseCount || 0,
        totalRevenue,
        soloCabPercentage,
        streakDays,
        partnershipsCount: partnerCount || 0,
        isFirstClient,
        isFirstCourse,
        recentGrowth,
      });

    } catch (error) {
      console.error('Error fetching driver stats:', error);
    }
  }, [driverId, dailyEntries, objectives]);

  // Fetch complete SoloCab stats for all periods
  const fetchSoloCabFullStats = useCallback(async () => {
    if (!driverId) return;

    try {
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const weekStart = startOfWeek(now, { locale: fr });
      const weekEnd = endOfWeek(now, { locale: fr });
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const yearStart = startOfYear(now);
      const yearEnd = endOfYear(now);

      // Helper to fetch stats for a period
      const fetchPeriodStats = async (start: Date, end: Date): Promise<SoloCabPeriodStats> => {
        const startStr = format(start, "yyyy-MM-dd'T'HH:mm:ss");
        const endStr = format(end, "yyyy-MM-dd'T'HH:mm:ss");

        const [coursesRes, clientsRes] = await Promise.all([
          supabase
            .from('courses')
            .select('id, final_price, price')
            .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
            .eq('status', 'completed')
            .gte('scheduled_date', startStr)
            .lte('scheduled_date', endStr),
          supabase
            .from('clients')
            .select('id')
            .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
            .gte('created_at', startStr)
            .lte('created_at', endStr),
        ]);

        const courses = coursesRes.data || [];
        const clients = clientsRes.data || [];

        return {
          courses: courses.length,
          revenue: courses.reduce((sum, c: any) => sum + (c.final_price || c.price || 0), 0),
          clients: clients.length,
        };
      };

      const [today, week, month, year] = await Promise.all([
        fetchPeriodStats(todayStart, todayEnd),
        fetchPeriodStats(weekStart, weekEnd),
        fetchPeriodStats(monthStart, monthEnd),
        fetchPeriodStats(yearStart, yearEnd),
      ]);

      setSoloCabFullStats({ today, week, month, year });
    } catch (error) {
      console.error('Error fetching SoloCab full stats:', error);
    }
  }, [driverId]);

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
    
    // Get courses completed on this date - use final_price for revenue
    const { data: courses } = await supabase
      .from('courses')
      .select('id, final_price, price, distance_km, duration_minutes, client_id')
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
      revenue: courses.reduce((sum, c: any) => sum + (c.final_price || c.price || 0), 0),
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
        averageRating: 0,
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

  // Fetch driver stats when data changes
  useEffect(() => {
    if (!loading && driverId) {
      fetchDriverStats();
      fetchSoloCabFullStats();
    }
  }, [loading, driverId, dailyEntries, objectives, fetchDriverStats, fetchSoloCabFullStats]);

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
    driverStats,
    soloCabFullStats,
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
    fetchSoloCabFullStats,
  };
}
