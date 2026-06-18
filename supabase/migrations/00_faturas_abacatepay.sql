CREATE TABLE IF NOT EXISTS public.faturas_abacatepay (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL, -- Sem a restrição (REFERENCES) para evitar erro caso a tabela de usuários tenha outro nome real no banco
  valor NUMERIC(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL,
  mes_referencia TIMESTAMP WITH TIME ZONE NOT NULL,
  url_nota_fiscal TEXT,
  abacatepay_invoice_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.faturas_abacatepay ENABLE ROW LEVEL SECURITY;

-- Políticas para usuários visualizarem suas próprias faturas
CREATE POLICY "Usuários podem ver suas próprias faturas"
  ON public.faturas_abacatepay
  FOR SELECT
  USING (clinica_id = auth.uid());
