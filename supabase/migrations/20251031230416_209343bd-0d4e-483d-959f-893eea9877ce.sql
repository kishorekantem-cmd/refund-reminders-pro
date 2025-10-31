-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS enforce_monthly_return_limit ON public.returns;
DROP FUNCTION IF EXISTS check_monthly_return_limit();

-- Create a function to check total return limit (25 per user)
CREATE OR REPLACE FUNCTION check_return_limit()
RETURNS TRIGGER AS $$
DECLARE
  return_count INTEGER;
BEGIN
  -- Count all returns created by this user
  SELECT COUNT(*)
  INTO return_count
  FROM public.returns
  WHERE user_id = NEW.user_id;
  
  -- If user has 25 or more returns, prevent insert
  IF return_count >= 25 THEN
    RAISE EXCEPTION 'Maximum return limit reached (25 per user). Please delete old returns to add new ones.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to enforce the limit
CREATE TRIGGER enforce_return_limit
  BEFORE INSERT ON public.returns
  FOR EACH ROW
  EXECUTE FUNCTION check_return_limit();