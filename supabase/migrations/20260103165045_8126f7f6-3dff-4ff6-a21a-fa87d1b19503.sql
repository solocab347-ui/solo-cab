-- Create partner_order_documents table for shared course order confirmations
CREATE TABLE public.partner_order_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shared_course_id UUID NOT NULL REFERENCES public.shared_courses(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  document_number TEXT NOT NULL,
  sender_driver_id UUID NOT NULL REFERENCES public.drivers(id),
  receiver_driver_id UUID NOT NULL REFERENCES public.drivers(id),
  -- Course details
  pickup_address TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,
  distance_km NUMERIC,
  passengers_count INTEGER DEFAULT 1,
  -- Financial details
  course_amount NUMERIC NOT NULL,
  commission_percentage NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL,
  receiver_earnings NUMERIC NOT NULL,
  payment_method_used TEXT,
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'paid')),
  completed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_confirmed_by UUID REFERENCES public.drivers(id),
  payment_notes TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partner_order_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Both sender and receiver drivers can view their order documents
CREATE POLICY "Drivers can view their order documents" 
ON public.partner_order_documents 
FOR SELECT 
USING (
  sender_driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  OR receiver_driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
);

-- Policy: Only system/functions can create order documents (through trigger or function)
CREATE POLICY "System can create order documents"
ON public.partner_order_documents
FOR INSERT
WITH CHECK (true);

-- Policy: Drivers can update their own order documents (for marking as paid)
CREATE POLICY "Drivers can update order documents"
ON public.partner_order_documents
FOR UPDATE
USING (
  sender_driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  OR receiver_driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
);

-- Add payment_method_used column to shared_courses if not exists
ALTER TABLE public.shared_courses ADD COLUMN IF NOT EXISTS payment_method_used TEXT;

-- Add partner_order_counter to drivers table for unique numbering
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS partner_order_counter INTEGER DEFAULT 0;

-- Create sequence for partner document numbers
CREATE SEQUENCE IF NOT EXISTS partner_order_document_seq START 1;

-- Function to generate partner order document when shared course completes
CREATE OR REPLACE FUNCTION public.generate_partner_order_document()
RETURNS TRIGGER AS $$
DECLARE
  v_course RECORD;
  v_doc_number TEXT;
  v_sender_counter INTEGER;
BEGIN
  -- Only trigger on completion
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    -- Get course details
    SELECT * INTO v_course FROM public.courses WHERE id = NEW.course_id;
    
    IF NOT FOUND THEN
      RETURN NEW;
    END IF;
    
    -- Increment sender's counter and get new number
    UPDATE public.drivers 
    SET partner_order_counter = COALESCE(partner_order_counter, 0) + 1 
    WHERE id = NEW.sender_driver_id
    RETURNING partner_order_counter INTO v_sender_counter;
    
    -- Generate document number: BCP-XXXXXX-NNN (Bon de Commande Partenaire)
    v_doc_number := 'BCP-' || 
                    LPAD((SELECT sharing_number::TEXT FROM public.drivers WHERE id = NEW.sender_driver_id), 6, '0') || 
                    '-' || 
                    LPAD(v_sender_counter::TEXT, 3, '0');
    
    -- Create the order document
    INSERT INTO public.partner_order_documents (
      shared_course_id,
      course_id,
      document_number,
      sender_driver_id,
      receiver_driver_id,
      pickup_address,
      destination_address,
      scheduled_date,
      distance_km,
      passengers_count,
      course_amount,
      commission_percentage,
      commission_amount,
      receiver_earnings,
      payment_method_used,
      status,
      completed_at
    ) VALUES (
      NEW.id,
      NEW.course_id,
      v_doc_number,
      NEW.sender_driver_id,
      NEW.receiver_driver_id,
      v_course.pickup_address,
      v_course.destination_address,
      v_course.scheduled_date,
      v_course.distance_km,
      v_course.passengers_count,
      NEW.course_amount,
      NEW.commission_percentage,
      NEW.commission_amount,
      NEW.course_amount - NEW.commission_amount,
      NEW.payment_method_used,
      'completed',
      NEW.completed_at
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for generating order documents
DROP TRIGGER IF EXISTS generate_partner_order_on_completion ON public.shared_courses;
CREATE TRIGGER generate_partner_order_on_completion
  AFTER UPDATE ON public.shared_courses
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_partner_order_document();

-- Create index for faster lookups
CREATE INDEX idx_partner_order_documents_sender ON public.partner_order_documents(sender_driver_id);
CREATE INDEX idx_partner_order_documents_receiver ON public.partner_order_documents(receiver_driver_id);
CREATE INDEX idx_partner_order_documents_shared_course ON public.partner_order_documents(shared_course_id);