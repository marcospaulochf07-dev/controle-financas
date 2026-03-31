ALTER TABLE public.driver_dailies
ADD COLUMN paid_routes integer NOT NULL DEFAULT 0;

ALTER TABLE public.driver_dailies
ADD CONSTRAINT driver_dailies_paid_routes_check
CHECK (paid_routes >= 0 AND paid_routes <= routes);

CREATE TABLE public.monthly_revenues (
  month_key text PRIMARY KEY,
  amount numeric NOT NULL DEFAULT 20000,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT monthly_revenues_month_key_check CHECK (month_key ~ '^\d{4}-\d{2}$')
);

ALTER TABLE public.monthly_revenues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on monthly_revenues"
ON public.monthly_revenues
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert on monthly_revenues"
ON public.monthly_revenues
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update on monthly_revenues"
ON public.monthly_revenues
FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete on monthly_revenues"
ON public.monthly_revenues
FOR DELETE
USING (true);

CREATE TABLE public.vehicles (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on vehicles"
ON public.vehicles
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert on vehicles"
ON public.vehicles
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update on vehicles"
ON public.vehicles
FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete on vehicles"
ON public.vehicles
FOR DELETE
USING (true);

CREATE TABLE public.drivers (
  name text PRIMARY KEY,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on drivers"
ON public.drivers
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert on drivers"
ON public.drivers
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update on drivers"
ON public.drivers
FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete on drivers"
ON public.drivers
FOR DELETE
USING (true);

CREATE TABLE public.recurring_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  day_of_month integer NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  category text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT recurring_templates_day_of_month_check CHECK (day_of_month >= 1 AND day_of_month <= 31),
  CONSTRAINT recurring_templates_amount_check CHECK (amount >= 0)
);

ALTER TABLE public.recurring_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on recurring_templates"
ON public.recurring_templates
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert on recurring_templates"
ON public.recurring_templates
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update on recurring_templates"
ON public.recurring_templates
FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete on recurring_templates"
ON public.recurring_templates
FOR DELETE
USING (true);

CREATE TABLE public.whatsapp_conversation_state (
  sender text PRIMARY KEY,
  pending_action text NOT NULL,
  pending_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_conversation_state ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_revenues;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recurring_templates;
