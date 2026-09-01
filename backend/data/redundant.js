// =========================================================================
// FAIL: api/data/redundant.js
// FUNGSI: GET/POST /api/data/redundant — Urus rekod redundan
// Gantikan: getIgnoredRedundant + ignoreRedundant dari GAS
// =========================================================================

import { getSupabase, handleOptions, sendSuccess, sendError } from '../supabase-client.js';
import { authMiddleware } from '../middleware.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;

  const { user, error: authError } = await authMiddleware(req);
  if (authError) return sendError(res, authError, 401);

  const supabase = getSupabase();

  // GET — Ambil senarai rekod yang diabaikan
  if (req.method === 'GET' || (req.method === 'POST' && req.body?.action === 'getIgnored')) {
    try {
      const { data: ignored, error } = await supabase
        .from('ignored_redundant')
        .select('record_id, ignored_by, ignored_at');

      if (error) {
        console.error('Get ignored error:', error);
        return sendError(res, 'Gagal memuat data.', 500);
      }

      // Return sebagai senarai ID yang diabaikan
      const ignoredIds = (ignored || []).map(r => r.record_id);

      return sendSuccess(res, { ignored: ignoredIds, records: ignored || [] });

    } catch (e) {
      console.error('Get ignored error:', e);
      return sendError(res, 'Ralat pelayan.', 500);
    }
  }

  // POST — Tandakan rekod sebagai diabaikan
  if (req.method === 'POST') {
    try {
      const { row, name } = req.body || {};
      if (!row) return sendError(res, 'ID rekod diperlukan.');

      const { error } = await supabase
        .from('ignored_redundant')
        .insert({
          record_id: row,
          ignored_by: name || user.nama
        });

      if (error) {
        console.error('Ignore redundant error:', error);
        return sendError(res, 'Gagal menandakan rekod.');
      }

      return sendSuccess(res, {}, 'Rekod berjaya ditandakan sebagai diabaikan.');

    } catch (e) {
      console.error('Ignore redundant error:', e);
      return sendError(res, 'Ralat pelayan.', 500);
    }
  }

  return sendError(res, 'Method not allowed', 405);
}
