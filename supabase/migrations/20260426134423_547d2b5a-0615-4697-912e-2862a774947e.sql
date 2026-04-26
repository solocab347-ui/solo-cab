
-- ============================================================
-- 1. TABLE DES SNAPSHOTS D'OBJECTIFS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.driver_objectives_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL,
  snapshot_year INTEGER NOT NULL,
  snapshot_month INTEGER NOT NULL CHECK (snapshot_month BETWEEN 1 AND 12),
  cards_proposed_target INTEGER NOT NULL DEFAULT 0,
  qr_scans_target INTEGER NOT NULL DEFAULT 0,
  direct_clients_target INTEGER NOT NULL DEFAULT 0,
  independence_percentage_target INTEGER NOT NULL DEFAULT 0,
  revenue_target INTEGER NOT NULL DEFAULT 0,
  change_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_objectives_snapshots_driver_period
  ON public.driver_objectives_snapshots(driver_id, snapshot_year DESC, snapshot_month DESC);

ALTER TABLE public.driver_objectives_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers read own objective snapshots" ON public.driver_objectives_snapshots;
CREATE POLICY "Drivers read own objective snapshots"
ON public.driver_objectives_snapshots
FOR SELECT
TO authenticated
USING (
  driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Drivers insert own objective snapshots" ON public.driver_objectives_snapshots;
CREATE POLICY "Drivers insert own objective snapshots"
ON public.driver_objectives_snapshots
FOR INSERT
TO authenticated
WITH CHECK (
  driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
);

-- ============================================================
-- 2. TRIGGER AUTO-SNAPSHOT
-- ============================================================
CREATE OR REPLACE FUNCTION public.snapshot_driver_objective_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INTEGER := EXTRACT(YEAR FROM now())::INTEGER;
  v_month INTEGER := EXTRACT(MONTH FROM now())::INTEGER;
  v_changed BOOLEAN := false;
BEGIN
  IF NEW.period_type <> 'monthly' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_changed := true;
  ELSIF TG_OP = 'UPDATE' THEN
    v_changed := (
      COALESCE(NEW.cards_proposed_target, 0) <> COALESCE(OLD.cards_proposed_target, 0)
      OR COALESCE(NEW.qr_scans_target, 0) <> COALESCE(OLD.qr_scans_target, 0)
      OR COALESCE(NEW.direct_clients_target, 0) <> COALESCE(OLD.direct_clients_target, 0)
      OR COALESCE(NEW.independence_percentage_target, 0) <> COALESCE(OLD.independence_percentage_target, 0)
      OR COALESCE(NEW.revenue_target, 0) <> COALESCE(OLD.revenue_target, 0)
    );
  END IF;

  IF NOT v_changed THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.driver_objectives_snapshots (
    driver_id, snapshot_year, snapshot_month,
    cards_proposed_target, qr_scans_target, direct_clients_target,
    independence_percentage_target, revenue_target,
    change_reason
  ) VALUES (
    NEW.driver_id, v_year, v_month,
    COALESCE(NEW.cards_proposed_target, 0),
    COALESCE(NEW.qr_scans_target, 0),
    COALESCE(NEW.direct_clients_target, 0),
    COALESCE(NEW.independence_percentage_target, 0),
    COALESCE(NEW.revenue_target, 0),
    CASE WHEN TG_OP = 'INSERT' THEN 'initial' ELSE 'update' END
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_driver_objectives ON public.driver_objectives;
CREATE TRIGGER trg_snapshot_driver_objectives
AFTER INSERT OR UPDATE ON public.driver_objectives
FOR EACH ROW
EXECUTE FUNCTION public.snapshot_driver_objective_change();

-- ============================================================
-- 3. FONCTION : nombre exact de clients fidèles (>= 2 courses)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_driver_loyal_clients_count(p_driver_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*), 0)::INTEGER
  FROM (
    SELECT client_id
    FROM public.courses
    WHERE driver_id = p_driver_id
      AND client_id IS NOT NULL
      AND status = 'completed'::course_status
    GROUP BY client_id
    HAVING COUNT(*) >= 2
  ) loyal;
$$;

GRANT EXECUTE ON FUNCTION public.get_driver_loyal_clients_count(UUID) TO authenticated;
