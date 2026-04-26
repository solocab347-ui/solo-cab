export interface DriverObjective {
  id: string;
  driver_id: string;
  period_type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  // Cibles "résultat" (CA = conséquence)
  revenue_target: number;
  courses_target: number;
  new_clients_target: number;
  hours_target: number;
  km_target: number;
  rating_target: number;
  // Cibles "acquisition" (les leviers réels d'indépendance)
  cards_proposed_target: number;
  qr_scans_target: number;
  direct_clients_target: number;
  independence_percentage_target: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DriverPlatform {
  id: string;
  driver_id: string;
  platform_name: string;
  platform_icon: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface DriverDailyEntry {
  id: string;
  driver_id: string;
  entry_date: string;
  platform_id: string | null;
  is_solocab: boolean;
  revenue: number;
  courses_count: number;
  new_clients_count: number;
  hours_worked: number;
  km_driven: number;
  // Tracking d'acquisition
  cards_proposed_count: number;
  qr_scans_count: number;
  direct_signups_count: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  platform?: DriverPlatform;
}

export interface DriverCoachingMessage {
  id: string;
  driver_id: string;
  message_type: 'suggestion' | 'alert' | 'motivation' | 'tip' | 'milestone';
  title: string;
  content: string;
  is_read: boolean;
  related_kpi: string | null;
  created_at: string;
}

export interface DriverWorkSchedule {
  id: string;
  driver_id: string;
  day_of_week: number;
  start_time: string | null;
  end_time: string | null;
  is_working_day: boolean;
  target_hours: number;
  target_revenue: number;
  target_courses: number;
  target_clients: number;
  break_start?: string | null;
  break_end?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PeriodStats {
  revenue: number;
  courses: number;
  newClients: number;
  hours: number;
  km: number;
  averageRating: number;
}

export interface ObjectiveProgress {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  objective: DriverObjective | null;
  current: PeriodStats;
  percentage: {
    revenue: number;
    courses: number;
    newClients: number;
    hours: number;
    km: number;
  };
}

export const DEFAULT_PLATFORMS = [
  { name: 'Uber', icon: 'car' },
  { name: 'Bolt', icon: 'zap' },
  { name: 'Heetch', icon: 'music' },
  { name: 'Marcel', icon: 'briefcase' },
  { name: 'FreeNow', icon: 'navigation' },
  { name: 'LeCab', icon: 'crown' },
  { name: 'Kapten', icon: 'star' },
  { name: 'Clients directs', icon: 'users' },
];

export const DAYS_OF_WEEK = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
];
