-- Add returned_date column to track when the item was actually returned
ALTER TABLE public.returns 
ADD COLUMN returned_date DATE;