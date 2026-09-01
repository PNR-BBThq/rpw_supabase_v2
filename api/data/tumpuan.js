// =========================================================================
// FAIL: api/data/tumpuan.js
// FUNGSI: GET /api/data/tumpuan — Senarai tanaman tumpuan
// Gantikan: getTanamanTumpuan dari GAS
// =========================================================================

import { getSupabase, handleOptions, sendSuccess, sendError } from '../supabase-client.js';
import { authMiddleware } from '../middleware.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET' && req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  const { user, error: authError } = await authMiddleware(req);
  if (authError) return sendError(res, authError, 401);

  try {
    const supabase = getSupabase();

    const { data: records, error } = await supabase
      .from('tanaman_tumpuan')
      .select('*')
      .eq('aktif', true)
      .order('negeri', { ascending: true })
      .order('tanaman', { ascending: true });

    if (error) {
      console.error('Tumpuan error:', error);
      return sendError(res, 'Gagal memuat senarai tumpuan.', 500);
    }

    return sendSuccess(res, { data: records || [] });

  } catch (e) {
    console.error('Tumpuan error:', e);
    return sendError(res, 'Ralat pelayan.', 500);
  }
}
