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

    let allRecords = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('Data')
        .select('*')
        .eq('status', 'DISAHKAN')
        .order('tarikh_bancian', { ascending: false })
        .range(from, from + step - 1);

      // Filter mengikut negeri (jika bukan ALL)
      if (state && state !== 'ALL' && state !== 'SEMUA') {
        query = query.eq('negeri', state.toUpperCase().trim());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Analytics query error:', error);
        return sendError(res, 'Ralat DB: ' + error.message, 500);
      }

      if (data && data.length > 0) {
        allRecords = allRecords.concat(data);
        if (data.length < step) {
          hasMore = false;
        } else {
          from += step;
        }
      } else {
        hasMore = false;
      }
    }

    const records = allRecords;

    // Transform data ke format pendek (sesuai dengan frontend AppState.mData)
    const transformed = (records || []).map((r, idx) => {
      // Parse JSONB fields secara selamat
      const parseJSONSafe = (val) => {
        if (typeof val === 'object' && val !== null) return val;
        if (typeof val === 'string') {
          try { return JSON.parse(val); } catch (e) { return {}; }
        }
        return {};
      };

      const luasSerangan = parseJSONSafe(r.luas_serangan);
      const peratusSerangan = parseJSONSafe(r.peratus_serangan);
      const keterukan = parseJSONSafe(r.keterukan);

      // Kira jumlah luas serangan
      let totalLuasSerangan = parseFloat(r.luas_serangan_total) || 0;
      if (totalLuasSerangan === 0) {
        totalLuasSerangan = Object.values(luasSerangan).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
      }

      // Kira tahap keterukan max
      let maxKeterukan = parseFloat(r.keterukan_max) || 0;
      if (maxKeterukan === 0 && Object.keys(keterukan).length > 0) {
        maxKeterukan = Math.max(...Object.values(keterukan).map(v => parseFloat(v) || 0));
      }

      // Selamatkan Date parser
      let dateT = '-';
      if (r.tarikh_bancian) {
        try {
          dateT = new Date(r.tarikh_bancian).toISOString().split('T')[0];
        } catch (e) {
          dateT = r.tarikh_bancian; // Fallback kepada string asal jika gagal parse
        }
      }

      return {
        id: r.id,
        t: dateT,
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
        k: maxKeterukan,
        ls: totalLuasSerangan,
        ps: peratusSerangan,
        s: r.syor_kawalan || '-',
        pg: r.nama || '-',
        em: r.email || '-',
        im: r.image_links || '',
        vb: r.verified_by || '',
        st: r.status,
        catatan: r.syor_kawalan || '-',
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
