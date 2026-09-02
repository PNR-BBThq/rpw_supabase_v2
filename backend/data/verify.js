// =========================================================================
// FAIL: api/data/verify.js
// FUNGSI: POST /api/data/verify — Sahkan atau tolak rekod
// Gantikan: submitVerify dari GAS
// =========================================================================

import { getSupabase, handleOptions, sendSuccess, sendError } from '../supabase-client.js';
import { authMiddleware } from '../middleware.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  const { user, error: authError } = await authMiddleware(req);
  if (authError) return sendError(res, authError, 401);

  try {
    const { row, act, reason, name } = req.body || {};

    if (!row || !act) {
      return sendError(res, 'Maklumat tidak lengkap.');
    }

    const supabase = getSupabase();
    const now = new Date().toISOString();
    const verifierName = name || user.nama;

    if (act === 'APPROVE') {
      // Sahkan rekod
      const logMsg = `DISAHKAN oleh ${verifierName} | ${now}`;
      const { error } = await supabase
        .from('Data')
        .update({
          status: 'DISAHKAN',
          log: logMsg
        })
        .eq('id', row);

      if (error) {
        console.error('Verify approve error:', error);
        return sendError(res, 'Gagal mengesahkan rekod.');
      }

      return sendSuccess(res, {}, '✅ Rekod berjaya disahkan.');

    } else if (act === 'REJECT') {
      // Tolak rekod
      const logMsg = `DITOLAK oleh ${verifierName} | Sebab: ${reason || 'Tiada sebab diberikan'} | ${now}`;
      const { error } = await supabase
        .from('Data')
        .update({
          status: 'DITOLAK',
          log: logMsg
        })
        .eq('id', row);

      if (error) {
        console.error('Verify reject error:', error);
        return sendError(res, 'Gagal menolak rekod.');
      }

      return sendSuccess(res, {}, '❌ Rekod telah ditolak.');
    }

    return sendError(res, 'Arahan tidak sah.');

  } catch (e) {
    console.error('Verify error:', e);
    return sendError(res, 'Ralat pelayan.', 500);
  }
}
