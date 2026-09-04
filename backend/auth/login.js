// =========================================================================
// FAIL: api/auth/login.js
// FUNGSI: POST /api/auth/login — Log masuk pengguna
// =========================================================================

import { getSupabase, handleOptions, sendSuccess, sendError, setCorsHeaders } from '../supabase-client.js';
import { generateToken } from '../middleware.js';

export default async function handler(req, res) {

  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  try {
    const { u, p } = req.body || {};

    if (!u || !p) {
      return sendError(res, 'Sila isi ID dan Kata Laluan.');
    }

    const supabase = getSupabase();
    const searchUid = u.trim();

    // Cari pengguna berdasarkan username (case-insensitive)
    const { data: user, error } = await supabase
      .from('user')
      .select('*')
      .ilike('uid', searchUid)
      .maybeSingle();

    console.log('Login lookup:', { searchUid, found: !!user, error: error?.message });

    if (error) {
      return sendError(res, 'Ralat DB: ' + error.message + ' (Code: ' + error.code + ')');
    }
    if (!user) {
      return sendError(res, 'ID Pengguna tidak dijumpai. (Carian: ' + searchUid + ')');
    }

    // Semak kata laluan (plaintext comparison)
    if (user.pwd !== p) {
      return sendError(res, 'Kata laluan salah.');
    }

    // Semak status akaun
    if (user.status !== 'AKTIF') {
      return sendError(res, `Akaun anda masih berstatus "${user.status}". Sila hubungi pentadbir.`);
    }

    // Jana token
    const token = generateToken(user.uid);

    // Return data dalam format yang frontend jangkakan
    return sendSuccess(res, {
      token: token,
      name: user.nama,
      role: user.role,
      state: user.state || user.negeri || 'ALL',
      negeri: user.negeri,
      jawatan: user.jawatan
    }, 'Log masuk berjaya');

  } catch (e) {
    console.error('Login error:', e);
    return sendError(res, 'Ralat: ' + (e.message || e.toString()), 500);
  }
}
