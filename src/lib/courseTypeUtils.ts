// Utility functions to identify course types and provide visual distinction

export type CourseType = 'personal' | 'partner' | 'company' | 'fleet';

export interface CourseTypeInfo {
  type: CourseType;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  partnerName?: string;
  partnerType?: string;
}

export const COURSE_TYPE_CONFIG: Record<CourseType, Omit<CourseTypeInfo, 'type' | 'partnerName' | 'partnerType'>> = {
  personal: {
    label: 'Course personnelle',
    shortLabel: 'Perso',
    icon: 'user',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30'
  },
  partner: {
    label: 'Course partenaire',
    shortLabel: 'Partenaire',
    icon: 'handshake',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30'
  },
  company: {
    label: 'Course entreprise',
    shortLabel: 'Entreprise',
    icon: 'building',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30'
  },
  fleet: {
    label: 'Course flotte',
    shortLabel: 'Flotte',
    icon: 'truck',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30'
  }
};

export interface CourseWithRelations {
  id: string;
  driver_id?: string | null;
  driver_ids?: string[] | null;
  shared_courses?: Array<{
    sender_driver_id: string;
    receiver_driver_id: string;
    sender_driver?: { profiles?: { full_name: string } };
    receiver_driver?: { profiles?: { full_name: string } };
  }>;
  company_courses?: Array<{
    company_id: string;
    company?: { company_name: string };
  }>;
  fleet_course_info?: {
    fleet_manager_id: string;
    fleet_name?: string;
  };
}

/**
 * Determines the type of a course based on its relationships
 */
export function getCourseType(
  course: CourseWithRelations,
  currentDriverId: string,
  additionalInfo?: {
    sharedCourses?: any[];
    companyCourses?: any[];
    fleetDriverInfo?: any;
  }
): CourseTypeInfo {
  // Check for shared/partner course
  const sharedCourses = course.shared_courses || additionalInfo?.sharedCourses;
  if (sharedCourses && sharedCourses.length > 0) {
    const sharedCourse = sharedCourses.find(
      sc => sc.receiver_driver_id === currentDriverId || sc.sender_driver_id === currentDriverId
    );
    if (sharedCourse) {
      const isSender = sharedCourse.sender_driver_id === currentDriverId;
      const partnerName = isSender 
        ? sharedCourse.receiver_driver?.profiles?.full_name 
        : sharedCourse.sender_driver?.profiles?.full_name;
      
      return {
        type: 'partner',
        ...COURSE_TYPE_CONFIG.partner,
        partnerName: partnerName || 'Partenaire',
        partnerType: isSender ? 'Envoyée' : 'Reçue'
      };
    }
  }

  // Check for company course
  const companyCourses = course.company_courses || additionalInfo?.companyCourses;
  if (companyCourses && companyCourses.length > 0) {
    const companyCourse = companyCourses[0];
    return {
      type: 'company',
      ...COURSE_TYPE_CONFIG.company,
      partnerName: companyCourse.company?.company_name || 'Entreprise'
    };
  }

  // Check for fleet course
  const fleetInfo = course.fleet_course_info || additionalInfo?.fleetDriverInfo;
  if (fleetInfo && fleetInfo.fleet_manager_id) {
    return {
      type: 'fleet',
      ...COURSE_TYPE_CONFIG.fleet,
      partnerName: fleetInfo.fleet_name || 'Gestionnaire de flotte'
    };
  }

  // Default: personal course
  return {
    type: 'personal',
    ...COURSE_TYPE_CONFIG.personal
  };
}

/**
 * Get filter options for course types
 */
export function getCourseTypeFilters(): Array<{ value: CourseType | 'all'; label: string }> {
  return [
    { value: 'all', label: 'Toutes les courses' },
    { value: 'personal', label: 'Courses personnelles' },
    { value: 'partner', label: 'Courses partenaires' },
    { value: 'company', label: 'Courses entreprises' },
    { value: 'fleet', label: 'Courses flottes' }
  ];
}
