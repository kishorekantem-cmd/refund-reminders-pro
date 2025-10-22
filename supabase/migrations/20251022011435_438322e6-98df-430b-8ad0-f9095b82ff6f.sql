-- First, make return_date nullable
ALTER TABLE returns 
ALTER COLUMN return_date DROP NOT NULL;

-- Update existing records that have null returned_date to use their purchase_date
UPDATE returns 
SET returned_date = purchase_date 
WHERE returned_date IS NULL;

-- Now make returned_date NOT NULL
ALTER TABLE returns 
ALTER COLUMN returned_date SET NOT NULL;