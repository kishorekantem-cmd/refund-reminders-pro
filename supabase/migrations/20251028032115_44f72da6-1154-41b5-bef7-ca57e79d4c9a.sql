-- Make returned_date nullable in returns table
ALTER TABLE public.returns 
ALTER COLUMN returned_date DROP NOT NULL;