-- Add has_receipt column to returns table
ALTER TABLE public.returns 
ADD COLUMN IF NOT EXISTS has_receipt BOOLEAN DEFAULT FALSE;

-- Update existing rows to check if they have receipt_image
UPDATE public.returns 
SET has_receipt = (receipt_image IS NOT NULL AND receipt_image != '')
WHERE has_receipt IS NULL OR has_receipt = FALSE;