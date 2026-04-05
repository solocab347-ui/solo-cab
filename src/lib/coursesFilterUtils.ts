import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { CourseType } from "@/lib/courseTypeUtils";

export interface FilterParams {
  dateFilter: string;
  customStartDate: string;
  customEndDate: string;
  searchQuery: string;
  minAmount: string;
  maxAmount: string;
  paymentStatusFilter: string;
  courseTypeFilter: CourseType | "all";
}

export const filterCoursesByDate = (coursesList: any[], dateFilter: string, customStartDate: string, customEndDate: string) => {
  if (dateFilter === "all") return coursesList;

  const now = new Date();
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  switch (dateFilter) {
    case "today":
      startDate = startOfDay(now);
      endDate = endOfDay(now);
      break;
    case "week":
      startDate = startOfWeek(now, { locale: fr });
      endDate = endOfWeek(now, { locale: fr });
      break;
    case "month":
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      break;
    case "last-month":
      const lastMonth = subMonths(now, 1);
      startDate = startOfMonth(lastMonth);
      endDate = endOfMonth(lastMonth);
      break;
    case "custom":
      if (customStartDate) startDate = startOfDay(new Date(customStartDate));
      if (customEndDate) endDate = endOfDay(new Date(customEndDate));
      break;
  }

  if (!startDate && !endDate) return coursesList;

  return coursesList.filter(course => {
    const courseDate = new Date(course.scheduled_date);
    if (startDate && endDate) return courseDate >= startDate && courseDate <= endDate;
    if (startDate) return courseDate >= startDate;
    if (endDate) return courseDate <= endDate;
    return true;
  });
};

export const applyAllFilters = (
  coursesList: any[],
  params: FilterParams,
  getCourseTypeInfoFn: (course: any) => { type: string }
) => {
  let filtered = [...coursesList];

  // Date filter
  filtered = filterCoursesByDate(filtered, params.dateFilter, params.customStartDate, params.customEndDate);

  // Search filter
  if (params.searchQuery.trim()) {
    const query = params.searchQuery.toLowerCase();
    filtered = filtered.filter(course => {
      const clientName = course.is_guest_booking || !course.clients?.profiles?.full_name
        ? (course.guest_name || "")
        : course.clients.profiles.full_name;
      return clientName.toLowerCase().includes(query);
    });
  }

  // Amount filter
  if (params.minAmount || params.maxAmount) {
    filtered = filtered.filter(course => {
      const amount = course.factures?.[0]?.amount || course.devis?.[0]?.amount;
      if (!amount) return false;
      const min = params.minAmount ? parseFloat(params.minAmount) : 0;
      const max = params.maxAmount ? parseFloat(params.maxAmount) : Infinity;
      return amount >= min && amount <= max;
    });
  }

  // Payment status filter
  if (params.paymentStatusFilter !== "all") {
    filtered = filtered.filter(course => {
      if (!course.factures?.[0]) return false;
      return course.factures[0].payment_status === params.paymentStatusFilter;
    });
  }

  // Course type filter
  if (params.courseTypeFilter !== "all") {
    filtered = filtered.filter(course => {
      const typeInfo = getCourseTypeInfoFn(course);
      return typeInfo.type === params.courseTypeFilter;
    });
  }

  return filtered;
};

export const sortByDate = (coursesList: any[]) =>
  [...coursesList].sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime());

export const sortConfirmedWithInProgressFirst = (coursesList: any[]) => {
  return [...coursesList].sort((a, b) => {
    if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
    if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;
    if (a.status === 'in_progress' && b.status === 'in_progress') {
      return new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime();
    }
    return new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime();
  });
};

export const getClientDisplayName = (course: any, companyCourseInfo?: { employeeName?: string | null } | null): string => {
  if (companyCourseInfo?.employeeName) return companyCourseInfo.employeeName;
  if (course.is_guest_booking || !course.clients?.profiles?.full_name) {
    return course.guest_name || "Client invité";
  }
  return course.clients.profiles.full_name;
};

export const getClientPhone = (course: any, companyCourseInfo?: { employeePhone?: string | null } | null): string | null => {
  if (companyCourseInfo?.employeePhone) return companyCourseInfo.employeePhone;
  if (course.is_guest_booking || !course.clients?.profiles?.phone) {
    return course.guest_phone || null;
  }
  return course.clients.profiles.phone;
};

export const getLatestDevis = (course: any): any | null => {
  if (!course.devis || course.devis.length === 0) return null;
  const acceptedDevis = course.devis.find((d: any) => d.status === 'accepted');
  if (acceptedDevis) return acceptedDevis;
  const sortedDevis = [...course.devis].sort((a: any, b: any) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return sortedDevis[0];
};
