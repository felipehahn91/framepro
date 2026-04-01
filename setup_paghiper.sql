ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS paghiper_api_key TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS paghiper_token TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS pix_url TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS pix_code TEXT;