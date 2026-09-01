// =========================================================================
// FAIL: api/auth/update-access.js
// FUNGSI: POST /api/auth/update-access — Kemas kini username/password
// =========================================================================

import { getSupabase, handleOptions, sendSuccess, sendError } from '../supabase-client.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  try {
    const { uid, pwd, row } = req.body || {};

    if (!uid || !pwd || !row) {
      return sendError(res, 'Maklumat tidak lengkap.');
    }

    const supabase = getSupabase();

    // Kemas kini uid dan pwd
    const { error } = await supabase
      .from('user')
      .update({
        uid: uid.toLowerCase().trim(),
        pwd: pwd
      })
      .eq('id', row);

    if (error) {
      console.error('Update access error:', error);
      return sendError(res, 'Gagal mengemaskini akses: ' + error.message);
    }

    return sendSuccess(res, {}, 'Akses telah dikemaskini.');

  } catch (e) {
    console.error('Update access error:', e);
    return sendError(res, 'Ralat pelayan.', 500);
  }
}
