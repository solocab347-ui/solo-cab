-- Add TVA number column to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS tva_number TEXT;