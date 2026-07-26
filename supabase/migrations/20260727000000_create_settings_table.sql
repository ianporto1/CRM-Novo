-- Migration: criar tabela settings no Supabase para armazenar configurações do sistema (Groq API, Prompts, etc.)
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo em settings" ON public.settings;
CREATE POLICY "Permitir tudo em settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
