import {allowAttempt} from '../rate-limit.js';
// =========================================================================
// FAIL: api/auth/login.js
// FUNGSI: POST /api/auth/login — Log masuk pengguna
// =========================================================================

import { getSupabase, handleOptions, sendSuccess, sendError, setCorsHeaders } from '../supabase-client.js';
import { verifyPassword, hashLegacy } from '../passwords.js';
import { signingReady } from '../token-signing.js';
import { generateToken } from '../middleware.js';

export default async function handler(req, res) {

  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  try {
    const { u, p } = req.body || {};

    if (!signingReady()) return sendError(res, 'Log masuk belum diaktifkan oleh pentadbir pelayan.', 503);
    if (typeof u !== 'string' || !/^[a-zA-Z0-9._@-]{1,100}$/.test(u.trim()) || typeof p !== 'string' || !p || Buffer.byteLength(p)>256) {
      return sendError(res, 'Sila isi ID dan Kata Laluan.');
    }

    if (!(await allowAttempt(req,u))) return sendError(res,'Terlalu banyak cubaan. Cuba semula selepas 15 minit.',429);
    const supabase = getSupabase();
    const searchUid = u.trim();

    // Cari pengguna berdasarkan username (case-insensitive)
    const { data: user, error } = await supabase
      .from('user')
      .select('*')
      .ilike('uid', searchUid)
      .maybeSingle();

    if (error) {
      return sendError(res, 'Log masuk tidak berjaya.');
    }
    if (!user) {
      return sendError(res, 'ID atau kata laluan tidak sah.');
    }

    // Semak kata laluan (plaintext comparison)
    if (!(await verifyPassword(p, user.pwd))) {
      return sendError(res, 'ID atau kata laluan tidak sah.');
    }

    // Semak status akaun
    if (user.status !== 'AKTIF') {
      return sendError(res, `Akaun anda masih berstatus "${user.status}". Sila hubungi pentadbir.`);
    }

    if (!user.pwd.startsWith('scrypt$')) {
      const hashed = await hashLegacy(p);
      const { data: migrated, error: migrationError } = await supabase.from('user').update({pwd: hashed}).eq('uid', user.uid).eq('pwd', user.pwd).select('uid').maybeSingle();
      if (migrationError || !migrated) return sendError(res, 'Sila cuba log masuk semula.', 503);
      user.pwd = hashed;
    }

    // Jana token
    const token = generateToken(user.uid, user.pwd);

    // Return data dalam format yang frontend jangkakan
    return sendSuccess(res, {
      token: token,
      name: user.nama,
      role: user.role,
      state: user.state || user.negeri || '',
      negeri: user.negeri,
      jawatan: user.jawatan
    }, 'Log masuk berjaya');

  } catch (e) {
    console.error('Login error:', e);
    return sendError(res, 'Log masuk tidak berjaya.', 500);
  }
}
