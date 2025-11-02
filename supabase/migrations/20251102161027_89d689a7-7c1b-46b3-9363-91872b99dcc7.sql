-- Create config table for app settings
CREATE TABLE IF NOT EXISTS public.config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read config (public settings)
CREATE POLICY "Anyone can view config"
  ON public.config
  FOR SELECT
  USING (true);

-- Only authenticated users can manage config (for admin purposes)
CREATE POLICY "Authenticated users can manage config"
  ON public.config
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Insert the app version
INSERT INTO public.config (key, value, description)
VALUES ('app_version', 'v1.0.3', 'Current app version')
ON CONFLICT (key) DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_config_updated_at
  BEFORE UPDATE ON public.config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();