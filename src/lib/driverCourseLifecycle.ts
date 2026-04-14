interface CourseQuoteLike {
  amount?: number | null;
  accepted_at?: string | null;
  created_at?: string | null;
  status?: string | null;
}

export interface DriverLifecycleCourseLike {
  created_at?: string | null;
  devis?: CourseQuoteLike[] | null;
  scheduled_date?: string | null;
  status?: string | null;
  updated_at?: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const getTodayBounds = () => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + DAY_MS);

  return { todayEnd, todayStart };
};

export const getAcceptedDevis = (course: DriverLifecycleCourseLike) => {
  return [...(course.devis ?? [])]
    .filter((quote) => quote.status === 'accepted')
    .sort((a, b) => {
      const aTime = new Date(a.accepted_at || a.created_at || 0).getTime();
      const bTime = new Date(b.accepted_at || b.created_at || 0).getTime();
      return bTime - aTime;
    })[0] ?? null;
};

export const isCourseTodayOrImmediate = (course: DriverLifecycleCourseLike) => {
  if (course.status === 'in_progress') return true;

  const { todayEnd, todayStart } = getTodayBounds();
  const scheduledDate = course.scheduled_date ? new Date(course.scheduled_date) : null;

  if (scheduledDate && scheduledDate < todayStart) return false;

  // For immediate courses (no scheduled_date), check staleness:
  // If the course was last updated more than 24h ago, it's stale/orphaned
  if (!scheduledDate) {
    const lastActivity = new Date(course.updated_at || course.created_at || 0).getTime();
    const twentyFourHoursAgo = Date.now() - DAY_MS;
    if (lastActivity < twentyFourHoursAgo) return false;
  }

  return !scheduledDate || scheduledDate < todayEnd;
};

export const isOperationalCourse = (course: DriverLifecycleCourseLike) => {
  if (course.status === 'in_progress' || course.status === 'accepted') return true;
  return Boolean(getAcceptedDevis(course));
};

export const getDriverStatusFromCourse = (course: DriverLifecycleCourseLike): 'assigned' | 'in_ride' | null => {
  if (course.status === 'in_progress') return 'in_ride';
  if (isOperationalCourse(course)) return 'assigned';
  return null;
};

const getCoursePriority = (course: DriverLifecycleCourseLike) => {
  if (course.status === 'in_progress') return 3;
  if (course.status === 'accepted' || getAcceptedDevis(course)) return 2;
  return 1;
};

export const pickRelevantOperationalCourse = <T extends DriverLifecycleCourseLike>(courses: T[]) => {
  const relevant = courses.filter((course) => isCourseTodayOrImmediate(course) && isOperationalCourse(course));

  return [...relevant].sort((a, b) => {
    const priorityDiff = getCoursePriority(b) - getCoursePriority(a);
    if (priorityDiff !== 0) return priorityDiff;

    const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
    const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
    return bTime - aTime;
  })[0] ?? null;
};

export const deriveDriverStatusFromCourses = (courses: DriverLifecycleCourseLike[]) => {
  const relevantCourse = pickRelevantOperationalCourse(courses);
  return relevantCourse ? getDriverStatusFromCourse(relevantCourse) : null;
};