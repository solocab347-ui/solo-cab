-- Drop the existing policy
DROP POLICY IF EXISTS "Partners can update payment status" ON partner_invoices;

-- Create corrected policy that allows:
-- 1. A driver with invoice_type='receiver' (the payer) to update their own invoice
-- 2. A driver with invoice_type='sender' (the payee) to confirm receipt
CREATE POLICY "Partners can update payment status" ON partner_invoices
FOR UPDATE
USING (
  driver_id = get_driver_id(auth.uid())
  OR EXISTS (
    SELECT 1 FROM partner_order_documents pod
    WHERE pod.id = partner_invoices.order_document_id
    AND (
      pod.sender_driver_id = get_driver_id(auth.uid())
      OR pod.receiver_driver_id = get_driver_id(auth.uid())
    )
  )
)
WITH CHECK (
  driver_id = get_driver_id(auth.uid())
  OR EXISTS (
    SELECT 1 FROM partner_order_documents pod
    WHERE pod.id = partner_invoices.order_document_id
    AND (
      pod.sender_driver_id = get_driver_id(auth.uid())
      OR pod.receiver_driver_id = get_driver_id(auth.uid())
    )
  )
);