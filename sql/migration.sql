-- =========================================================================
-- MIGRASI SUPABASE: Sistem Pelaporan Digital PNR
-- Jalankan SQL ini di Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- =========================================================================

-- =====================
-- 1. JADUAL PENGGUNA
-- =====================
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  uid TEXT UNIQUE NOT NULL,
  pwd TEXT NOT NULL,
  nama TEXT NOT NULL,
  ic TEXT,
  jawatan TEXT,
  negeri TEXT,
  role TEXT DEFAULT 'STAFF' CHECK (role IN ('STAFF', 'PENYELIA', 'ADMIN')),
  status TEXT DEFAULT 'MENUNGGU' CHECK (status IN ('AKTIF', 'MENUNGGU', 'DITOLAK', 'DIGANTUNG')),
  state TEXT DEFAULT 'ALL',
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- 2. JADUAL DATA BANCIAN
-- =====================
CREATE TABLE IF NOT EXISTS data_bancian (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT now(),
  nama TEXT,
  email TEXT,
  tarikh_bancian DATE,
  negeri TEXT,
  daerah TEXT,
  lokasi TEXT,
  koordinat TEXT,
  kategori TEXT,
  nama_tanaman TEXT,
  varieti TEXT,
  umur_tanaman TEXT,
  luas_bertanam NUMERIC(12,4) DEFAULT 0,
  luas_serangan JSONB DEFAULT '{}',
  peratus_serangan JSONB DEFAULT '{}',
  keterukan JSONB DEFAULT '{}',
  keterukan_max INT DEFAULT 0,
  luas_serangan_total NUMERIC(12,4) DEFAULT 0,
  syor_kawalan TEXT,
  image_links TEXT,
  caption TEXT,
  status TEXT DEFAULT 'DRAF' CHECK (status IN ('DRAF', 'MENUNGGU', 'DISAHKAN', 'DITOLAK')),
  verified_by TEXT,
  log TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- 3. JADUAL MASTER TANAMAN/PEROSAK
-- =====================
CREATE TABLE IF NOT EXISTS master_tanaman (
  id SERIAL PRIMARY KEY,
  kategori TEXT NOT NULL,
  nama_tanaman TEXT NOT NULL,
  senarai_perosak TEXT[] DEFAULT '{}',
  UNIQUE(kategori, nama_tanaman)
);

-- =====================
-- 4. JADUAL SASARAN KPI
-- =====================
CREATE TABLE IF NOT EXISTS sasaran_kpi (
  id SERIAL PRIMARY KEY,
  negeri TEXT NOT NULL,
  tanaman TEXT NOT NULL,
  sasaran_ha NUMERIC(12,4) DEFAULT 0,
  tahun INT DEFAULT 2026,
  UNIQUE(negeri, tanaman, tahun)
);

-- =====================
-- 5. JADUAL TANAMAN TUMPUAN
-- =====================
CREATE TABLE IF NOT EXISTS tanaman_tumpuan (
  id SERIAL PRIMARY KEY,
  negeri TEXT NOT NULL,
  tanaman TEXT NOT NULL,
  aktif BOOLEAN DEFAULT true,
  UNIQUE(negeri, tanaman)
);

-- =====================
-- 6. JADUAL LOG SESI
-- =====================
CREATE TABLE IF NOT EXISTS session_logs (
  id BIGSERIAL PRIMARY KEY,
  user_name TEXT,
  user_role TEXT,
  login_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT
);

-- =====================
-- 7. JADUAL REDUNDANT IGNORED
-- =====================
CREATE TABLE IF NOT EXISTS ignored_redundant (
  id BIGSERIAL PRIMARY KEY,
  record_id BIGINT REFERENCES data_bancian(id) ON DELETE CASCADE,
  ignored_by TEXT,
  ignored_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- INDEXES UNTUK PRESTASI
-- =====================
CREATE INDEX IF NOT EXISTS idx_bancian_negeri ON data_bancian(negeri);
CREATE INDEX IF NOT EXISTS idx_bancian_status ON data_bancian(status);
CREATE INDEX IF NOT EXISTS idx_bancian_tarikh ON data_bancian(tarikh_bancian);
CREATE INDEX IF NOT EXISTS idx_bancian_nama ON data_bancian(nama);
CREATE INDEX IF NOT EXISTS idx_bancian_kategori ON data_bancian(kategori);
CREATE INDEX IF NOT EXISTS idx_bancian_tanaman ON data_bancian(nama_tanaman);
CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_negeri ON users(negeri);
CREATE INDEX IF NOT EXISTS idx_ignored_record ON ignored_redundant(record_id);

-- =====================
-- ROW LEVEL SECURITY
-- =====================
ALTER TABLE data_bancian ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_tanaman ENABLE ROW LEVEL SECURITY;
ALTER TABLE sasaran_kpi ENABLE ROW LEVEL SECURITY;
ALTER TABLE tanaman_tumpuan ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ignored_redundant ENABLE ROW LEVEL SECURITY;

-- Policy: Service role dan anon key boleh akses semua
-- (Keselamatan dikawal di peringkat Vercel Serverless Functions)
CREATE POLICY "allow_all_data_bancian" ON data_bancian FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_master_tanaman" ON master_tanaman FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_sasaran_kpi" ON sasaran_kpi FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_tanaman_tumpuan" ON tanaman_tumpuan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_session_logs" ON session_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_ignored_redundant" ON ignored_redundant FOR ALL USING (true) WITH CHECK (true);

-- =====================
-- FUNGSI AUTO-UPDATE updated_at
-- =====================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_bancian_updated_at
  BEFORE UPDATE ON data_bancian
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================
-- SELESAI! Semua jadual telah dicipta.
-- =====================
