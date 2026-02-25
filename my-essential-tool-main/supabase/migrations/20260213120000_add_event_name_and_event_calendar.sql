-- Add event_name to promotions (festival/event identifier for matching past vs upcoming)
ALTER TABLE public.promotions
ADD COLUMN IF NOT EXISTS event_name TEXT;

CREATE INDEX IF NOT EXISTS idx_promotions_event_name_end_date
ON public.promotions (event_name, end_date)
WHERE event_name IS NOT NULL;

-- Event calendar: upcoming festivals/events with date and time
CREATE TABLE public.event_calendar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL DEFAULT '00:00',
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.event_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read event_calendar"
ON public.event_calendar FOR SELECT USING (public.is_authenticated_user());
