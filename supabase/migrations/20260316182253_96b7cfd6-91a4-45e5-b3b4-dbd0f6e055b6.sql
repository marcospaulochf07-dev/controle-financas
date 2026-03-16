
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL DEFAULT 'outros',
  description TEXT NOT NULL DEFAULT '',
  vehicle TEXT NOT NULL DEFAULT 'Geral',
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pago',
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on expenses" ON public.expenses FOR SELECT USING (true);
CREATE POLICY "Allow public insert on expenses" ON public.expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on expenses" ON public.expenses FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on expenses" ON public.expenses FOR DELETE USING (true);
