-- Add new status values to course_status enum for real-time tracking phases
ALTER TYPE course_status ADD VALUE IF NOT EXISTS 'driver_approaching';
ALTER TYPE course_status ADD VALUE IF NOT EXISTS 'driver_arrived';