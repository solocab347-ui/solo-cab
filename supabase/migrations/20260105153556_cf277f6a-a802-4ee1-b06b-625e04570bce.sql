-- =====================================================
-- CORRECTIONS SYSTÈME PARTENARIAT ENTREPRISE-CHAUFFEUR
-- =====================================================

-- 1. TABLE: Documents justificatifs de paiement
CREATE TABLE IF NOT EXISTS public.company_payment_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES public.company_payments(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,
  document_type TEXT DEFAULT 'proof_of_payment', -- proof_of_payment, invoice, receipt, other
  file_name TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  uploaded_by_user_id UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.company_payment_documents ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Companies can manage their payment documents"
  ON public.company_payment_documents
  FOR ALL
  USING (
    payment_id IN (
      SELECT id FROM public.company_payments 
      WHERE company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Drivers can view payment documents"
  ON public.company_payment_documents
  FOR SELECT
  USING (
    payment_id IN (
      SELECT id FROM public.company_payments 
      WHERE driver_id = (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    )
  );

-- Index
CREATE INDEX idx_company_payment_documents_payment ON public.company_payment_documents(payment_id);

-- 2. Ajouter colonne pour facture consolidée
ALTER TABLE public.company_payments
ADD COLUMN IF NOT EXISTS consolidated_invoice_number TEXT,
ADD COLUMN IF NOT EXISTS consolidated_invoice_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS consolidated_invoice_url TEXT;

-- 3. FONCTION: Vérifier les courses en cours avant terminaison
CREATE OR REPLACE FUNCTION check_pending_courses_before_termination()
RETURNS TRIGGER AS $$
DECLARE
  pending_courses_count INTEGER;
BEGIN
  -- Only check when termination is being requested
  IF NEW.termination_requested_at IS NOT NULL AND OLD.termination_requested_at IS NULL THEN
    -- Count pending courses for this partnership
    SELECT COUNT(*) INTO pending_courses_count
    FROM public.courses c
    JOIN public.factures f ON f.course_id = c.id
    WHERE f.driver_id = NEW.driver_id
      AND f.company_id = NEW.company_id
      AND c.status NOT IN ('completed', 'cancelled', 'no_show');
    
    IF pending_courses_count > 0 THEN
      RAISE EXCEPTION 'Impossible de terminer le partenariat: % course(s) en cours', pending_courses_count;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger pour vérification
DROP TRIGGER IF EXISTS check_termination_pending_courses ON public.company_driver_agreements;
CREATE TRIGGER check_termination_pending_courses
BEFORE UPDATE ON public.company_driver_agreements
FOR EACH ROW
EXECUTE FUNCTION check_pending_courses_before_termination();

-- 4. FONCTION: Générer facture consolidée quand paiement reçu
CREATE OR REPLACE FUNCTION generate_consolidated_invoice_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_number TEXT;
  v_driver RECORD;
  v_company RECORD;
  v_year_month TEXT;
  v_seq INTEGER;
BEGIN
  -- Only when status changes to 'received'
  IF NEW.status = 'received' AND (OLD.status IS NULL OR OLD.status != 'received') THEN
    -- Get driver and company info
    SELECT * INTO v_driver FROM public.drivers WHERE id = NEW.driver_id;
    SELECT * INTO v_company FROM public.companies WHERE id = NEW.company_id;
    
    -- Generate invoice number: FACT-ENT-YYYYMM-XXXX
    v_year_month := to_char(NOW(), 'YYYYMM');
    
    SELECT COALESCE(MAX(
      CAST(NULLIF(regexp_replace(consolidated_invoice_number, '[^0-9]', '', 'g'), '') AS INTEGER)
    ), 0) + 1 INTO v_seq
    FROM public.company_payments
    WHERE consolidated_invoice_number LIKE 'FACT-ENT-' || v_year_month || '%';
    
    v_invoice_number := 'FACT-ENT-' || v_year_month || '-' || LPAD(v_seq::TEXT, 4, '0');
    
    -- Update payment with consolidated invoice
    NEW.consolidated_invoice_number := v_invoice_number;
    NEW.consolidated_invoice_generated_at := NOW();
    
    -- Notify driver about consolidated invoice
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      v_driver.user_id,
      '📄 Facture consolidée générée',
      'Facture ' || v_invoice_number || ' de ' || NEW.amount || '€ pour ' || v_company.company_name,
      'invoice',
      '/driver-dashboard?tab=company-payments'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger pour génération facture
DROP TRIGGER IF EXISTS generate_consolidated_invoice_trigger ON public.company_payments;
CREATE TRIGGER generate_consolidated_invoice_trigger
BEFORE UPDATE ON public.company_payments
FOR EACH ROW
EXECUTE FUNCTION generate_consolidated_invoice_on_payment();

-- 5. FONCTION: Notifier en cas de retard de paiement (overdue)
CREATE OR REPLACE FUNCTION notify_overdue_company_payments()
RETURNS void AS $$
DECLARE
  v_agreement RECORD;
  v_company RECORD;
  v_driver RECORD;
BEGIN
  FOR v_agreement IN 
    SELECT cda.*, c.company_name, c.user_id as company_user_id, d.user_id as driver_user_id
    FROM public.company_driver_agreements cda
    JOIN public.companies c ON c.id = cda.company_id
    JOIN public.drivers d ON d.id = cda.driver_id
    WHERE cda.status = 'accepted'
      AND cda.next_payment_due IS NOT NULL
      AND cda.next_payment_due < NOW() - INTERVAL '3 days'
      AND cda.outstanding_balance > 0
  LOOP
    -- Notify company about overdue payment
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT v_agreement.company_user_id, 
           '⚠️ Paiement en retard',
           'Paiement de ' || v_agreement.outstanding_balance || '€ en retard pour le partenariat chauffeur',
           'payment_overdue',
           '/company-dashboard?tab=payments'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE user_id = v_agreement.company_user_id 
        AND type = 'payment_overdue'
        AND created_at > NOW() - INTERVAL '7 days'
        AND link LIKE '%tab=payments%'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Storage bucket pour les justificatifs de paiement
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('payment-documents', 'payment-documents', false, 10485760) -- 10MB max
ON CONFLICT (id) DO NOTHING;

-- Policies pour storage
CREATE POLICY "Companies can upload payment documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment-documents' 
  AND auth.uid() IN (SELECT user_id FROM public.companies)
);

CREATE POLICY "Partners can view payment documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-documents'
  AND (
    auth.uid() IN (SELECT user_id FROM public.companies)
    OR auth.uid() IN (SELECT user_id FROM public.drivers)
  )
);

CREATE POLICY "Companies can delete their payment documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'payment-documents'
  AND auth.uid() IN (SELECT user_id FROM public.companies)
);