-- Migration: criar tabela leads no Supabase com suporte a sincronização automática
CREATE TABLE IF NOT EXISTS public.leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'novo',
    source TEXT DEFAULT 'WhatsApp',
    value NUMERIC DEFAULT 0,
    notes TEXT,
    contact_id TEXT REFERENCES public.contacts(id) ON DELETE SET NULL,
    remote_jid TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para buscas rápidas e dedup de contatos/leads
CREATE INDEX IF NOT EXISTS idx_leads_contact_id ON public.leads(contact_id);
CREATE INDEX IF NOT EXISTS idx_leads_remote_jid ON public.leads(remote_jid);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo em leads" ON public.leads;
CREATE POLICY "Permitir tudo em leads" ON public.leads FOR ALL USING (true) WITH CHECK (true);

