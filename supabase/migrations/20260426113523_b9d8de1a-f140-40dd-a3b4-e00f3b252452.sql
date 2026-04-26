-- Tracking acquisition par entrée journalière
ALTER TABLE public.driver_daily_entries
  ADD COLUMN IF NOT EXISTS cards_proposed_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qr_scans_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS direct_signups_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.driver_daily_entries.cards_proposed_count IS 'Nombre de fois où le chauffeur a proposé sa carte SoloCab/QR pendant une course (sur cette plateforme ce jour-là)';
COMMENT ON COLUMN public.driver_daily_entries.qr_scans_count IS 'Nombre de scans QR enregistrés ce jour-là (déclaratif si externe, factuel si SoloCab)';
COMMENT ON COLUMN public.driver_daily_entries.direct_signups_count IS 'Nombre de nouveaux clients directs inscrits via QR ce jour-là';

-- Étendre les objectifs avec KPIs d'acquisition
ALTER TABLE public.driver_objectives
  ADD COLUMN IF NOT EXISTS cards_proposed_target integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qr_scans_target integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS direct_clients_target integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS independence_percentage_target integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.driver_objectives.cards_proposed_target IS 'Cible de propositions de carte sur la période';
COMMENT ON COLUMN public.driver_objectives.qr_scans_target IS 'Cible de scans QR sur la période';
COMMENT ON COLUMN public.driver_objectives.direct_clients_target IS 'Cible de nouveaux clients directs sur la période';
COMMENT ON COLUMN public.driver_objectives.independence_percentage_target IS 'Cible de % du CA réalisé via SoloCab (vs plateformes externes)';