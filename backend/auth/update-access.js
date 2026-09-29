import { authMiddleware } from '../middleware.js';
import { hashPassword, verifyPassword, validPassword } from '../passwords.js';
// =========================================================================
// FAIL: api/auth/update-access.js
// FUNGSI: POST /api/auth/update-access — Kemas kini username/password
// =========================================================================

import { getSupabase, handleOptions, sendSuccess, sendError } from '../supabase-client.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  const { user, error: authError } = await authMiddleware(req);
  if (authError) return sendError(res, authError, 401);
  try {
    const { uid, pwd, row } = req.body || {};

    if (!uid || !pwd || !row) {
      return sendError(res, 'Maklumat tidak lengkap.');
    }

    if (String(row) !== String(user.id) || uid.toLowerCase().trim() !== user.uid.toLowerCase()) return sendError(res, 'Akses hanya untuk akaun sendiri; ID tidak boleh ditukar di sini.', 403);
    if (!(await verifyPassword(req.body.currentPassword, user.pwd))) return sendError(res, 'Kata laluan semasa tidak sah.', 403);
    if (!validPassword(pwd)) return sendError(res, 'Kata laluan baharu mesti 12–256 aksara.');
    const supabase = getSupabase();

    // Kemas kini uid dan pwd
    const { error } = await supabase
      .from('user')
      .update({
        uid: uid.toLowerCase().trim(),
        pwd: await hashPassword(pwd)
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
