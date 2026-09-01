// =========================================================================
// FAIL: api/auth/forgot-password.js
// FUNGSI: POST /api/auth/forgot-password — Semak identiti untuk lupa kata laluan
// =========================================================================

import { getSupabase, handleOptions, sendSuccess, sendError } from '../supabase-client.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  try {
    const { nama, ic } = req.body || {};

    if (!nama || !ic) {
      return sendError(res, 'Sila isi kedua-dua maklumat.');
    }

    const supabase = getSupabase();

    // Cari pengguna berdasarkan nama dan IC
    const { data: user, error } = await supabase
      .from('users')
      .select('id, uid, pwd')
      .ilike('nama', nama.trim())
      .eq('ic', ic.trim())
      .single();

    if (error || !user) {
      return sendError(res, 'Rekod tidak dijumpai. Pastikan Nama dan No. K/P adalah sama seperti dalam sistem.');
    }

    return sendSuccess(res, {
      uid: user.uid,
      pwd: user.pwd,
      row: user.id
    }, 'Rekod dijumpai');

  } catch (e) {
    console.error('Forgot password error:', e);
    return sendError(res, 'Ralat pelayan.', 500);
  }
}
