-- Execute este script no SQL Editor do Supabase

-- Tabela de Portfólios
CREATE TABLE public.portfolios (
    id UUID DEFAULT auth.uid() PRIMARY KEY,
    indicators TEXT[] DEFAULT '{"IPCA", "Selic", "Dólar"}'::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS (Row Level Security) para que cada usuário só veja seu portfólio
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seu próprio portfólio" 
ON public.portfolios FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio portfólio" 
ON public.portfolios FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Usuários podem inserir seu próprio portfólio" 
ON public.portfolios FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Tabela de Regras de Alerta
CREATE TABLE public.alert_rules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    indicator TEXT NOT NULL, -- ex: 'IPCA', 'Selic'
    condition TEXT NOT NULL, -- ex: '>', '<'
    threshold NUMERIC NOT NULL, -- ex: 4.5
    email_target TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam suas próprias regras" 
ON public.alert_rules FOR ALL 
USING (auth.uid() = user_id);
