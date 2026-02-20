-- ═══════════════════════════════════════════════════════════════════
--  MI GESTOR SEGURO — SUPABASE SETUP COMPLETO
--  Ejecuta en: Supabase Dashboard → SQL Editor → New Query → Run ▶️
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- PASO 1: CREAR TABLAS
-- ───────────────────────────────────────────────────────────────────

-- Perfiles de usuario
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT,
  username   TEXT DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cuentas Gmail (username y password se guardan encriptados AES-256)
CREATE TABLE IF NOT EXISTS gmail_accounts (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT NOT NULL,
  password   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Otras cuentas (Netflix, Instagram, etc.)
CREATE TABLE IF NOT EXISTS other_accounts (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform   TEXT NOT NULL,
  username   TEXT NOT NULL,
  password   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Datos bancarios (todos los campos sensibles encriptados AES-256)
CREATE TABLE IF NOT EXISTS bank_data (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_name      TEXT NOT NULL,
  first_name     TEXT NOT NULL,
  last_name      TEXT NOT NULL,
  id_number      TEXT NOT NULL,
  account_type   TEXT NOT NULL,
  account_number TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ
);

-- ───────────────────────────────────────────────────────────────────
-- PASO 2: ACTIVAR ROW LEVEL SECURITY EN TODAS LAS TABLAS
-- (sin esto cualquier usuario podría leer datos de otros)
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE other_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_data      ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────────────────────────────
-- PASO 3: POLÍTICAS RLS — tabla: profiles
-- ───────────────────────────────────────────────────────────────────

-- Ver solo su propio perfil
CREATE POLICY "profiles: select own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Insertar solo su propio perfil
CREATE POLICY "profiles: insert own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Actualizar solo su propio perfil
CREATE POLICY "profiles: update own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Eliminar solo su propio perfil (por si borra la cuenta)
CREATE POLICY "profiles: delete own"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- ───────────────────────────────────────────────────────────────────
-- PASO 4: POLÍTICAS RLS — tabla: gmail_accounts
-- ───────────────────────────────────────────────────────────────────

CREATE POLICY "gmail_accounts: select own"
  ON gmail_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "gmail_accounts: insert own"
  ON gmail_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gmail_accounts: update own"
  ON gmail_accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gmail_accounts: delete own"
  ON gmail_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────────────
-- PASO 5: POLÍTICAS RLS — tabla: other_accounts
-- ───────────────────────────────────────────────────────────────────

CREATE POLICY "other_accounts: select own"
  ON other_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "other_accounts: insert own"
  ON other_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "other_accounts: update own"
  ON other_accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "other_accounts: delete own"
  ON other_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────────────
-- PASO 6: POLÍTICAS RLS — tabla: bank_data
-- ───────────────────────────────────────────────────────────────────

CREATE POLICY "bank_data: select own"
  ON bank_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "bank_data: insert own"
  ON bank_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bank_data: update own"
  ON bank_data FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bank_data: delete own"
  ON bank_data FOR DELETE
  USING (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────────────
-- PASO 7: STORAGE BUCKET para fotos de perfil
-- ───────────────────────────────────────────────────────────────────

-- Crear bucket público "avatars"
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Solo el dueño puede subir su foto (la carpeta debe llamarse igual que su user_id)
CREATE POLICY "avatars: upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Cualquiera puede ver las fotos (son públicas para mostrarse en el avatar)
CREATE POLICY "avatars: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Solo el dueño puede actualizar su foto
CREATE POLICY "avatars: update own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Solo el dueño puede eliminar su foto
CREATE POLICY "avatars: delete own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ───────────────────────────────────────────────────────────────────
-- PASO 8: TRIGGER — crear perfil automático al registrarse
-- ───────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, avatar_url, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    '',
    NULL,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Eliminar trigger anterior si existe y recrear
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════
-- ✅ VERIFICAR QUE TODO SE CREÓ BIEN:
-- ═══════════════════════════════════════════════════════════════════
-- Ejecuta esto para ver las políticas activas:
--
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, cmd;
-- ═══════════════════════════════════════════════════════════════════
