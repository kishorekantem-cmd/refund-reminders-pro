-- Create a function to check monthly return limit before insert
CREATE OR REPLACE FUNCTION check_monthly_return_limit()
RETURNS TRIGGER AS $$
DECLARE
  return_count INTEGER;
BEGIN
  -- Count returns created by this user in the current month
  SELECT COUNT(*)
  INTO return_count
  FROM public.returns
  WHERE user_id = NEW.user_id
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP);
  
  -- If user has 25 or more returns this month, prevent insert
  IF return_count >= 25 THEN
    RAISE EXCEPTION 'You''ve reached your monthly limit of 25 returns. Please delete old returns to add new ones.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to enforce monthly limit
CREATE TRIGGER enforce_monthly_return_limit
  BEFORE INSERT ON public.returns
  FOR EACH ROW
  EXECUTE FUNCTION check_monthly_return_limit();