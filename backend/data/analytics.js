// =========================================================================
// FAIL: api/data/analytics.js
// FUNGSI: GET /api/data/analytics — Ambil semua data bancian DISAHKAN
// Gantikan: getAnalytics dari GAS
// =========================================================================

import { getSupabase, handleOptions, sendSuccess, sendError } from '../supabase-client.js';
import { authMiddleware } from '../middleware.js';

export default async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET' && req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  // Sahkan token
  const { user, error: authError } = await authMiddleware(req);
  if (authError) return sendError(res, authError, 401);

  try {
    const supabase = getSupabase();
    const state = req.query?.state || req.body?.state || user.state || 'ALL';

    // Query semua data bancian yang DISAHKAN
    let query = supabase
      .from('Data')
      .select('*')
      .eq('status', 'DISAHKAN')
      .order('tarikh_bancian', { ascending: false });

    // Filter mengikut negeri (jika bukan ALL)
    if (state && state !== 'ALL' && state !== 'SEMUA') {
      query = query.eq('negeri', state.toUpperCase().trim());
    }

    const { data: records, error } = await query;

    if (error) {
      console.error('Analytics query error:', error);
      return sendError(res, 'Ralat DB: ' + error.message, 500);
    }

    // Transform data ke format pendek (sesuai dengan frontend AppState.mData)
    const transformed = (records || []).map((r, idx) => {
      // Parse JSONB fields
      const luasSerangan = r.luas_serangan || {};
      const peratusSerangan = r.peratus_serangan || {};
      const keterukan = r.keterukan || {};

      // Kira jumlah luas serangan
      let totalLuasSerangan = r.luas_serangan_total || 0;
      if (totalLuasSerangan === 0 && typeof luasSerangan === 'object') {
        totalLuasSerangan = Object.values(luasSerangan).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
      }

      return {
        id: r.id,
        t: r.tarikh_bancian ? new Date(r.tarikh_bancian).toISOString().split('T')[0] : '-',
        n: r.negeri || '-',
        d: r.daerah || '-',
        l: r.lokasi || '-',
        c: r.koordinat || '-',
        kt: r.kategori || '-',
        tn: r.nama_tanaman || '-',
        vr: r.varieti || '-',
        um: r.umur_tanaman || '-',
        lt: parseFloat(r.luas_bertanam) || 0,
        p: luasSerangan,
        pk: keterukan,
        k: r.keterukan_max || 0,
        ls: totalLuasSerangan,
        ps: peratusSerangan,
        s: r.syor_kawalan || '-',
        pg: r.nama || '-',
        em: r.email || '-',
        im: r.image_links || '',
        vb: r.verified_by || '',
        st: r.status,
        catatan: r.syor_kawalan || '-',
        // Timestamp untuk paparan "Tarikh Dihantar"
        timestamp: r.timestamp,
        created_at: r.created_at
      };
    });

    return sendSuccess(res, { records: transformed });

  } catch (e) {
    console.error('Analytics error:', e);
    return sendError(res, 'Ralat Runtime: ' + (e.message || e.toString()), 500);
  }
}
