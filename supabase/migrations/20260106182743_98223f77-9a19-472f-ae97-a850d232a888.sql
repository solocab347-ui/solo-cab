-- Rendre course_id nullable pour les notes de frais non liées à une course
ALTER TABLE public.expense_reports ALTER COLUMN course_id DROP NOT NULL;