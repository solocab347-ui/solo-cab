-- Add pending_plate_type column to drivers table for storing plate type choice before payment
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS pending_plate_type TEXT;