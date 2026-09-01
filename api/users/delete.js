// =========================================================================
// FAIL: api/users/delete.js
// FUNGSI: POST /api/users/delete — Padam akaun pengguna
// Gantikan: deleteUser dari GAS
// =========================================================================

import { getSupabase, handleOptions, sendSuccess, sendError } from '../supabase-client.js';
import { authMiddleware } from '../middleware.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST' && req.method !== 'DELETE') return sendError(res, 'Method not allowed', 405);

  const { user, error: authError } = await authMiddleware(req);
  if (authError) return sendError(res, authError, 401);

  if (user.role !== 'ADMIN') {
    return sendError(res, 'Kebenaran tidak mencukupi.', 403);
  }

  try {
    const row = req.body?.row || req.query?.row;
    if (!row) return sendError(res, 'ID pengguna diperlukan.');

    const supabase = getSupabase();

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', row);

    if (error) {
      console.error('Delete user error:', error);
      return sendError(res, 'Gagal memadam pengguna.');
    }

    return sendSuccess(res, {}, 'Akaun pengguna berjaya dipadamkan.');

  } catch (e) {
    console.error('Delete user error:', e);
    return sendError(res, 'Ralat pelayan.', 500);
  }
}
