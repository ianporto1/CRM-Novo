-- Migration: criar tabelas contacts e messages no Supabase
CREATE TABLE IF NOT EXISTS public.contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    remote_jid TEXT UNIQUE NOT NULL,
    last_message TEXT,
    unread INTEGER DEFAULT 0,
    profile_pic_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
    id TEXT PRIMARY KEY,
    contact_id TEXT REFERENCES public.contacts(id) ON DELETE CASCADE,
    remote_jid TEXT NOT NULL,
    text TEXT NOT NULL,
    sender TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    status TEXT DEFAULT 'SENT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo em contacts" ON public.contacts;
CREATE POLICY "Permitir tudo em contacts" ON public.contacts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em messages" ON public.messages;
CREATE POLICY "Permitir tudo em messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);
