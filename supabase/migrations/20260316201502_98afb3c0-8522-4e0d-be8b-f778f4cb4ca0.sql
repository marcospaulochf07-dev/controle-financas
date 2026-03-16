
CREATE TABLE public.driver_dailies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  driver_name text NOT NULL,
  routes integer NOT NULL DEFAULT 1,
  value_per_route numeric NOT NULL DEFAULT 45,
  vehicle text NOT NULL DEFAULT 'Geral',
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_dailies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on driver_dailies" ON public.driver_dailies FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on driver_dailies" ON public.driver_dailies FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public delete on driver_dailies" ON public.driver_dailies FOR DELETE TO public USING (true);
CREATE POLICY "Allow public update on driver_dailies" ON public.driver_dailies FOR UPDATE TO public USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_dailies;
