// =========================================================================
// FAIL: api/data/master-tanaman.js
// FUNGSI: GET /api/data/master-tanaman — Ambil master data tanaman/perosak
// Gantikan: getTanamanList dari GAS
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
      .from('master_tanaman')
      .select('*')
      .order('kategori', { ascending: true })
      .order('nama_tanaman', { ascending: true });

    if (error) {
      console.error('Master tanaman error:', error);
      return sendError(res, 'Gagal memuat data tanaman.', 500);
    }

    // Transform ke format hierarki: { kategori: { tanaman: [perosak, ...] } }
    const result = {};
    (records || []).forEach(r => {
      if (!result[r.kategori]) result[r.kategori] = {};
      result[r.kategori][r.nama_tanaman] = r.senarai_perosak || [];
    });

    return sendSuccess(res, { data: result });

  } catch (e) {
    console.error('Master tanaman error:', e);
    return sendError(res, 'Ralat pelayan.', 500);
  }
}
